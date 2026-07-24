package com.vektra.service;

import com.vektra.dto.journey.JourneyEventPayload;
import com.vektra.dto.response.JourneyBackfillSummary;
import com.vektra.dto.response.MemberJourneyEventResponse;
import com.vektra.dto.response.MemberJourneyResponse;
import com.vektra.entity.Account;
import com.vektra.entity.MemberJourneyEvent;
import com.vektra.entity.Purchase;
import com.vektra.entity.StoreItem;
import com.vektra.entity.Task;
import com.vektra.entity.Transaction;
import com.vektra.entity.User;
import com.vektra.enums.AccountState;
import com.vektra.enums.JourneySourceType;
import com.vektra.enums.MemberJourneyEventType;
import com.vektra.enums.TransactionStatus;
import com.vektra.enums.TransactionType;
import com.vektra.enums.UserType;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.MemberJourneyMapper;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.MemberJourneyEventRepository;
import com.vektra.repository.PurchaseRepository;
import com.vektra.repository.StoreItemRepository;
import com.vektra.repository.TaskRepository;
import com.vektra.repository.TransactionRepository;
import com.vektra.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Append-only member journey timeline. Events are written from domain services
 * (signup, activation, reward, purchase, transfer) and can be backfilled from OLTP.
 */
@Service
@RequiredArgsConstructor
public class MemberJourneyService {

    private static final Logger log = LoggerFactory.getLogger(MemberJourneyService.class);

    private final MemberJourneyEventRepository journeyRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final PurchaseRepository purchaseRepository;
    private final TaskRepository taskRepository;
    private final StoreItemRepository storeItemRepository;
    private final MemberJourneyMapper journeyMapper;

    @Transactional(readOnly = true)
    public MemberJourneyResponse getUserJourney(Long userId) {
        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        Account account = accountRepository
                .findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for user: " + userId));

        Long balance = transactionRepository.sumSignedAmountByUserIdAndStatus(userId, TransactionStatus.COMPLETED);
        if (balance == null) {
            balance = 0L;
        }

        List<MemberJourneyEventResponse> events = journeyRepository.findAllByUserIdOrderByOccurredAtAsc(userId).stream()
                .map(journeyMapper::toResponse)
                .toList();

        return MemberJourneyResponse.builder()
                .userId(userId)
                .name(user.getName())
                .surname(user.getSurname())
                .email(account.getEmail())
                .accountState(account.getAccountState())
                .balance(balance)
                .events(events)
                .build();
    }

    @Transactional(readOnly = true)
    public MemberJourneyEventResponse getEventById(Long eventId) {
        MemberJourneyEvent event = journeyRepository
                .findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey event not found: " + eventId));
        return journeyMapper.toResponse(event);
    }

    /** Idempotent backfill from existing OLTP rows (safe to re-run). */
    @Transactional
    public JourneyBackfillSummary backfill(Long userIdFilter) {
        int[] created = {0};
        int[] skipped = {0};

        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getUserType() == UserType.USER)
                .filter(u -> userIdFilter == null || u.getId().equals(userIdFilter))
                .toList();

        Map<Long, Account> accountByUserId = accountRepository.findAll().stream()
                .collect(Collectors.toMap(Account::getUserId, Function.identity(), (a, b) -> a));

        for (User user : users) {
            Account account = accountByUserId.get(user.getId());
            if (account == null) {
                continue;
            }
            recordSignupIfAbsent(user, account, user.getCreatedAt(), created, skipped);
            if (account.getAccountState() == AccountState.ACTIVE
                    && account.getUpdatedAt().isAfter(account.getCreatedAt())) {
                recordAccountActivatedIfAbsent(account, account.getUpdatedAt(), created, skipped);
            }
        }

        List<Purchase> purchases = purchaseRepository.findAll().stream()
                .filter(p -> userIdFilter == null || p.getUserId().equals(userIdFilter))
                .toList();
        Map<Long, StoreItem> itemsById = storeItemRepository.findAll().stream()
                .collect(Collectors.toMap(StoreItem::getId, Function.identity()));

        List<Transaction> allTransactions = transactionRepository.findAll();
        Map<Long, Long> spendTxIdByPurchaseId = allTransactions.stream()
                .filter(t -> t.getType() == TransactionType.SPEND && t.getPurchaseId() != null)
                .collect(Collectors.toMap(Transaction::getPurchaseId, Transaction::getId, (a, b) -> a));

        for (Purchase purchase : purchases) {
            StoreItem item = itemsById.get(purchase.getStoreItemId());
            Long txId = spendTxIdByPurchaseId.get(purchase.getId());
            recordPurchaseIfAbsent(purchase, item, txId, created, skipped);
        }

        List<Transaction> transactions = allTransactions.stream()
                .filter(t -> t.getStatus() == TransactionStatus.COMPLETED)
                .filter(t -> userIdFilter == null || t.getUserId().equals(userIdFilter))
                .toList();

        Map<Long, Task> tasksById = taskRepository.findAll().stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));
        Map<Long, User> usersById = users.stream().collect(Collectors.toMap(User::getId, Function.identity()));

        for (Transaction tx : transactions) {
            switch (tx.getType()) {
                case EARN -> recordRewardEarnedIfAbsent(tx, tasksById.get(tx.getTaskId()), created, skipped);
                case SPEND -> {
                    // Purchases are recorded from purchases table; skip SPEND rows tied to purchases.
                    if (tx.getPurchaseId() == null) {
                        log.debug("Skipping orphan SPEND tx {} without purchase_id", tx.getId());
                        skipped[0]++;
                    }
                }
                case TRANSFER_OUT, TRANSFER_IN -> recordTransferIfAbsent(
                        tx, usersById.get(tx.getCounterpartyUserId()), created, skipped);
                default -> { }
            }
        }

        return JourneyBackfillSummary.builder()
                .userId(userIdFilter)
                .eventsCreated(created[0])
                .eventsSkipped(skipped[0])
                .build();
    }

    @Transactional
    public void recordSignup(User user, Account account) {
        int[] created = {0};
        int[] skipped = {0};
        recordSignupIfAbsent(user, account, user.getCreatedAt(), created, skipped);
    }

    @Transactional
    public void recordAccountActivated(Account account) {
        int[] created = {0};
        int[] skipped = {0};
        recordAccountActivatedIfAbsent(account, Instant.now(), created, skipped);
    }

    @Transactional
    public void recordRewardEarned(Transaction tx) {
        Task task = tx.getTaskId() != null ? taskRepository.findById(tx.getTaskId()).orElse(null) : null;
        int[] created = {0};
        int[] skipped = {0};
        recordRewardEarnedIfAbsent(tx, task, created, skipped);
    }

    @Transactional
    public void recordPurchase(Purchase purchase, StoreItem item, Long transactionId) {
        int[] created = {0};
        int[] skipped = {0};
        recordPurchaseIfAbsent(purchase, item, transactionId, created, skipped);
    }

    @Transactional
    public void recordTransferLeg(Transaction tx) {
        User counterparty = tx.getCounterpartyUserId() != null
                ? userRepository.findById(tx.getCounterpartyUserId()).orElse(null)
                : null;
        int[] created = {0};
        int[] skipped = {0};
        recordTransferIfAbsent(tx, counterparty, created, skipped);
    }

    private void recordSignupIfAbsent(
            User user, Account account, Instant occurredAt, int[] created, int[] skipped) {
        if (user.getUserType() != UserType.USER) {
            return;
        }
        JourneyEventPayload payload = JourneyEventPayload.builder().email(account.getEmail()).build();
        if (insertIfAbsent(
                user.getId(),
                MemberJourneyEventType.SIGNUP,
                JourneySourceType.USER,
                user.getId(),
                occurredAt,
                payload)) {
            created[0]++;
        } else {
            skipped[0]++;
        }
    }

    private void recordAccountActivatedIfAbsent(
            Account account, Instant occurredAt, int[] created, int[] skipped) {
        JourneyEventPayload payload = JourneyEventPayload.builder().email(account.getEmail()).build();
        if (insertIfAbsent(
                account.getUserId(),
                MemberJourneyEventType.ACCOUNT_ACTIVATED,
                JourneySourceType.ACCOUNT,
                account.getId(),
                occurredAt,
                payload)) {
            created[0]++;
        } else {
            skipped[0]++;
        }
    }

    private void recordRewardEarnedIfAbsent(
            Transaction tx, Task task, int[] created, int[] skipped) {
        JourneyEventPayload payload = JourneyEventPayload.builder()
                .amount(tx.getAmount())
                .direction("IN")
                .transactionId(tx.getId())
                .taskId(tx.getTaskId())
                .taskName(task != null ? task.getName() : null)
                .taskCompletionId(tx.getTaskCompletionId())
                .build();
        if (insertIfAbsent(
                tx.getUserId(),
                MemberJourneyEventType.REWARD_EARNED,
                JourneySourceType.TRANSACTION,
                tx.getId(),
                tx.getCreatedAt(),
                payload)) {
            created[0]++;
        } else {
            skipped[0]++;
        }
    }

    private void recordPurchaseIfAbsent(
            Purchase purchase, StoreItem item, Long transactionId, int[] created, int[] skipped) {
        JourneyEventPayload payload = JourneyEventPayload.builder()
                .amount(purchase.getAmountPaid())
                .direction("OUT")
                .purchaseId(purchase.getId())
                .storeItemId(purchase.getStoreItemId())
                .storeItemName(item != null ? item.getName() : null)
                .transactionId(transactionId)
                .build();
        if (insertIfAbsent(
                purchase.getUserId(),
                MemberJourneyEventType.PURCHASE,
                JourneySourceType.PURCHASE,
                purchase.getId(),
                purchase.getCreatedAt(),
                payload)) {
            created[0]++;
        } else {
            skipped[0]++;
        }
    }

    private void recordTransferIfAbsent(
            Transaction tx, User counterparty, int[] created, int[] skipped) {
        MemberJourneyEventType eventType =
                tx.getType() == TransactionType.TRANSFER_OUT
                        ? MemberJourneyEventType.TRANSFER_OUT
                        : MemberJourneyEventType.TRANSFER_IN;
        String direction = tx.getType() == TransactionType.TRANSFER_IN ? "IN" : "OUT";
        JourneyEventPayload payload = JourneyEventPayload.builder()
                .amount(tx.getAmount())
                .direction(direction)
                .transactionId(tx.getId())
                .transferId(tx.getTransferId())
                .counterpartyUserId(tx.getCounterpartyUserId())
                .counterpartyName(counterparty != null ? counterparty.getName() : null)
                .counterpartySurname(counterparty != null ? counterparty.getSurname() : null)
                .build();
        if (insertIfAbsent(
                tx.getUserId(),
                eventType,
                JourneySourceType.TRANSACTION,
                tx.getId(),
                tx.getCreatedAt(),
                payload)) {
            created[0]++;
        } else {
            skipped[0]++;
        }
    }

    private boolean insertIfAbsent(
            Long userId,
            MemberJourneyEventType eventType,
            JourneySourceType sourceType,
            Long sourceId,
            Instant occurredAt,
            JourneyEventPayload payload) {
        if (journeyRepository.existsBySourceTypeAndSourceIdAndEventType(sourceType, sourceId, eventType)) {
            return false;
        }
        journeyRepository.save(MemberJourneyEvent.builder()
                .userId(userId)
                .eventType(eventType)
                .occurredAt(Objects.requireNonNullElse(occurredAt, Instant.now()))
                .sourceType(sourceType)
                .sourceId(sourceId)
                .payloadJson(journeyMapper.serializePayload(payload))
                .build());
        return true;
    }
}
