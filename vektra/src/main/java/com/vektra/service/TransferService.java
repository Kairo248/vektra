package com.vektra.service;

import com.vektra.dto.request.TransferRequest;
import com.vektra.dto.response.TransferResponse;
import com.vektra.entity.Account;
import com.vektra.entity.Transaction;
import com.vektra.entity.User;
import com.vektra.entity.Wallet;
import com.vektra.enums.AccountState;
import com.vektra.enums.TransactionStatus;
import com.vektra.enums.TransactionType;
import com.vektra.enums.WalletState;
import com.vektra.exception.AccountNotActiveException;
import com.vektra.exception.InsufficientBalanceException;
import com.vektra.exception.RecipientMismatchException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.messaging.LedgerTransactionRecordedEvent;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.TransactionRepository;
import com.vektra.repository.UserRepository;
import com.vektra.repository.WalletRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Peer-to-peer transfer of Vektras.
 *
 * Atomicity model: every transfer writes exactly two ledger rows
 * (TRANSFER_OUT on the sender, TRANSFER_IN on the recipient) inside a single
 * {@code @Transactional} unit, sharing a UUID {@code transferId}. If anything
 * after the lock throws, both inserts roll back and no Kafka event is emitted
 * (events fire AFTER_COMMIT — see {@link com.vektra.messaging.LedgerKafkaPublisher}).
 *
 * Concurrency model: a {@code PESSIMISTIC_WRITE} lock on the sender's wallet
 * row serializes all transfers from the same sender. Without this, two parallel
 * requests could both read the same balance, both pass the "enough funds"
 * check, and both insert — overdrafting the sender.
 *
 * Recipient verification: {@code recipientId} is authoritative. If
 * {@code recipientEmail} or {@code recipientName} are also supplied, they're
 * matched against the real recipient and a mismatch aborts the transfer with
 * a generic message — the endpoint never reveals what the real values are,
 * so it can't be turned into a recipient-info scraper.
 */
@Service
@RequiredArgsConstructor
public class TransferService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public TransferResponse transfer(Long senderId, TransferRequest request) {
        Long recipientId = request.getRecipientId();
        int amount = request.getAmount();

        // (1) Cheap pre-checks — fail before grabbing any DB locks.
        if (senderId == null) {
            throw new IllegalArgumentException("senderId is required");
        }
        if (recipientId.equals(senderId)) {
            throw new IllegalArgumentException("Sender and recipient must be different users");
        }
        // @Min(1)/@Max are validated at the controller, but double-check here so
        // this service is safe to call from non-HTTP entry points too.
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }

        // (2) Lock the sender's wallet row. This is the serialization point for
        // every transfer/spend from this user — held until COMMIT.
        Wallet senderWallet = walletRepository.findByUserIdForUpdate(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for sender: " + senderId));
        if (senderWallet.getWalletState() != WalletState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Sender wallet must be ACTIVE; current state: " + senderWallet.getWalletState());
        }

        // (3) Sender account must exist and be ACTIVE. Re-check under the lock
        // so a freeze that happened between request entry and lock acquisition
        // is honored.
        Account senderAccount = accountRepository.findByUserId(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for sender: " + senderId));
        if (senderAccount.getAccountState() != AccountState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Sender account must be ACTIVE; current state: " + senderAccount.getAccountState());
        }

        // (4) Resolve and verify the recipient. Recipient wallet is NOT locked
        // — only the sender's side has a contended resource (the balance).
        User recipientUser = userRepository.findById(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found: " + recipientId));
        Account recipientAccount = accountRepository.findByUserId(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Account not found for recipient: " + recipientId));
        if (recipientAccount.getAccountState() != AccountState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Recipient account must be ACTIVE; current state: " + recipientAccount.getAccountState());
        }
        Wallet recipientWallet = walletRepository.findByUserId(recipientId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Wallet not found for recipient: " + recipientId));
        if (recipientWallet.getWalletState() != WalletState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Recipient wallet must be ACTIVE; current state: " + recipientWallet.getWalletState());
        }

        verifyRecipientConfirmation(request, recipientUser, recipientAccount);

        // (5) Funds check, signed (so a sender with negative carryover can't
        // pretend SUM(amount) is positive). Held under the lock, so the value
        // we read is the value that will commit.
        Long currentBalance = transactionRepository.sumSignedAmountByUserIdAndStatus(
                senderId, TransactionStatus.COMPLETED);
        if (currentBalance == null) {
            currentBalance = 0L;
        }
        if (currentBalance < amount) {
            throw new InsufficientBalanceException(
                    "Insufficient balance. Available: " + currentBalance + ", required: " + amount);
        }

        // (6) Double-entry: write both legs in this same transaction.
        String transferId = UUID.randomUUID().toString();
        Transaction outRow = transactionRepository.save(Transaction.builder()
                .userId(senderId)
                .counterpartyUserId(recipientId)
                .transferId(transferId)
                .amount(amount)
                .type(TransactionType.TRANSFER_OUT)
                .status(TransactionStatus.COMPLETED)
                .build());
        Transaction inRow = transactionRepository.save(Transaction.builder()
                .userId(recipientId)
                .counterpartyUserId(senderId)
                .transferId(transferId)
                .amount(amount)
                .type(TransactionType.TRANSFER_IN)
                .status(TransactionStatus.COMPLETED)
                .build());

        // (7) Emit Kafka events — actually published AFTER_COMMIT, so a
        // rollback below this point would suppress both.
        eventPublisher.publishEvent(new LedgerTransactionRecordedEvent(
                outRow.getId(),
                outRow.getUserId(),
                transferId,
                recipientId,
                outRow.getAmount(),
                outRow.getType().name(),
                outRow.getStatus().name(),
                outRow.getCreatedAt()));
        eventPublisher.publishEvent(new LedgerTransactionRecordedEvent(
                inRow.getId(),
                inRow.getUserId(),
                transferId,
                senderId,
                inRow.getAmount(),
                inRow.getType().name(),
                inRow.getStatus().name(),
                inRow.getCreatedAt()));

        long senderBalanceAfter = currentBalance - amount;
        return TransferResponse.builder()
                .transferId(transferId)
                .senderId(senderId)
                .recipientId(recipientId)
                .amount(amount)
                .senderTransactionId(outRow.getId())
                .recipientTransactionId(inRow.getId())
                .senderBalanceAfter(senderBalanceAfter)
                .createdAt(outRow.getCreatedAt())
                .build();
    }

    /**
     * "Confirmation of Payee" check. Each supplied confirmation field must
     * match the recipient's actual value; missing fields skip the check.
     * The thrown message is intentionally vague to keep this endpoint from
     * being usable as an email/name oracle for a given user id.
     */
    private void verifyRecipientConfirmation(
            TransferRequest request, User recipientUser, Account recipientAccount) {
        String suppliedEmail = nullIfBlank(request.getRecipientEmail());
        if (suppliedEmail != null
                && !suppliedEmail.equalsIgnoreCase(recipientAccount.getEmail())) {
            throw new RecipientMismatchException(
                    "Recipient email does not match the recipient ID. Double-check who you're sending to.");
        }
        String suppliedName = nullIfBlank(request.getRecipientName());
        if (suppliedName != null) {
            String actualFull = (recipientUser.getName() + " " + recipientUser.getSurname()).trim();
            if (!normalizeName(suppliedName).equalsIgnoreCase(normalizeName(actualFull))) {
                throw new RecipientMismatchException(
                        "Recipient name does not match the recipient ID. Double-check who you're sending to.");
            }
        }
    }

    private static String nullIfBlank(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** Collapse multiple whitespace into single spaces and trim, so "  Ada   Lovelace " ≡ "Ada Lovelace". */
    private static String normalizeName(String s) {
        return s.trim().replaceAll("\\s+", " ");
    }
}
