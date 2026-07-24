package com.vektra.service;

import com.vektra.dto.response.TransactionResponse;
import com.vektra.dto.response.WalletBalanceResponse;
import com.vektra.entity.StoreItem;
import com.vektra.entity.Transaction;
import com.vektra.entity.User;
import com.vektra.repository.StoreItemRepository;
import com.vektra.enums.TransactionStatus;
import com.vektra.enums.TransactionType;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.TransactionMapper;
import com.vektra.messaging.LedgerTransactionRecordedEvent;
import com.vektra.repository.TransactionRepository;
import com.vektra.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final StoreItemRepository storeItemRepository;
    private final TransactionMapper transactionMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final MemberJourneyService memberJourneyService;

    /**
     * Inserts a COMPLETED EARN for a task reward. Idempotent per {@code taskCompletionId} when present.
     * Ledger rows are never updated after insert.
     */
    @Transactional
    public void recordTaskReward(Long userId, Long taskId, int amount, Long taskCompletionId) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Reward amount must be positive");
        }
        if (taskCompletionId != null && transactionRepository.existsByTaskCompletionId(taskCompletionId)) {
            return;
        }
        Transaction tx = Transaction.builder()
                .userId(userId)
                .taskId(taskId)
                .taskCompletionId(taskCompletionId)
                .amount(amount)
                .type(TransactionType.EARN)
                .status(TransactionStatus.COMPLETED)
                .build();
        Transaction saved = transactionRepository.save(tx);
        memberJourneyService.recordRewardEarned(saved);
        eventPublisher.publishEvent(
                LedgerTransactionRecordedEvent.forTaskReward(
                        saved.getId(),
                        saved.getUserId(),
                        saved.getTaskId(),
                        saved.getTaskCompletionId(),
                        saved.getAmount(),
                        saved.getType().name(),
                        saved.getStatus().name(),
                        saved.getCreatedAt()));
    }

    /**
     * Inserts a COMPLETED SPEND for a store purchase. Caller must hold the buyer's wallet
     * lock and validate balance before calling.
     */
    @Transactional
    public Transaction recordPurchase(Long userId, Long storeItemId, int amount, Long purchaseId) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Purchase amount must be positive");
        }
        Transaction tx = Transaction.builder()
                .userId(userId)
                .storeItemId(storeItemId)
                .purchaseId(purchaseId)
                .amount(amount)
                .type(TransactionType.SPEND)
                .status(TransactionStatus.COMPLETED)
                .build();
        Transaction saved = transactionRepository.save(tx);
        eventPublisher.publishEvent(
                LedgerTransactionRecordedEvent.forPurchase(
                        saved.getId(),
                        saved.getUserId(),
                        saved.getPurchaseId(),
                        saved.getStoreItemId(),
                        saved.getAmount(),
                        saved.getType().name(),
                        saved.getStatus().name(),
                        saved.getCreatedAt()));
        return saved;
    }

    @Transactional(readOnly = true)
    public WalletBalanceResponse getWalletBalance(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Long balance = transactionRepository.sumSignedAmountByUserIdAndStatus(
                userId, TransactionStatus.COMPLETED);
        return WalletBalanceResponse.builder().userId(userId).balance(balance).build();
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listForUser(Long userId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        List<Transaction> rows = transactionRepository.findAllByUserIdOrderByCreatedAtDesc(userId);

        // Batch-load counterparty users so the response can include first/last name on
        // transfer rows. One findAllById covers the whole page; non-transfer rows have
        // counterpartyUserId == null and contribute nothing to the lookup set.
        Set<Long> counterpartyIds = rows.stream()
                .map(Transaction::getCounterpartyUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        Map<Long, User> counterpartyById = counterpartyIds.isEmpty()
                ? Map.of()
                : userRepository.findAllById(counterpartyIds).stream()
                        .collect(Collectors.toMap(User::getId, Function.identity()));

        Set<Long> storeItemIds = rows.stream()
                .map(Transaction::getStoreItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        Map<Long, StoreItem> storeItemById = storeItemIds.isEmpty()
                ? Map.of()
                : storeItemRepository.findAllById(storeItemIds).stream()
                        .collect(Collectors.toMap(StoreItem::getId, Function.identity()));

        return rows.stream()
                .map(tx -> transactionMapper.toResponse(
                        tx,
                        tx.getCounterpartyUserId() != null
                                ? counterpartyById.get(tx.getCounterpartyUserId())
                                : null,
                        tx.getStoreItemId() != null
                                ? storeItemById.get(tx.getStoreItemId())
                                : null))
                .toList();
    }
}
