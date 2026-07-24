package com.vektra.service.simulation;

import com.vektra.config.SimulationProperties;
import com.vektra.dto.request.CreatePurchaseRequest;
import com.vektra.dto.request.SignupRequest;
import com.vektra.dto.request.TransferRequest;
import com.vektra.dto.response.SimulationRunSummary;
import com.vektra.dto.response.StoreItemResponse;
import com.vektra.dto.response.TaskCompletionResponse;
import com.vektra.dto.response.TaskResponse;
import com.vektra.entity.Account;
import com.vektra.entity.User;
import com.vektra.enums.AccountState;
import com.vektra.enums.TaskCompletionStatus;
import com.vektra.enums.TransactionStatus;
import com.vektra.enums.UserType;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.TransactionRepository;
import com.vektra.repository.UserRepository;
import com.vektra.service.PurchaseService;
import com.vektra.service.StoreItemService;
import com.vektra.service.TaskCompletionService;
import com.vektra.service.TaskService;
import com.vektra.service.TransferService;
import com.vektra.service.UserService;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Daily synthetic-data generator.
 *
 * <p>Two-cohort model: every run adds a fresh batch of {@code PENDING} users to
 * the admin approval inbox, and drives transactions only from users that were
 * <em>already approved</em> ({@code ACTIVE}) in previous runs / by the admin. On
 * a brand-new database there are no ACTIVE non-admin users yet, so the first run
 * produces users/items/tasks but no transactions — approve some users and the
 * next run will start moving money.
 *
 * <p>Everything flows through the normal domain services, so generated rows obey
 * every invariant (PENDING signup, active-account checks, balance-from-ledger,
 * unique constraints, stock decrement) and emit the same Kafka ledger events.
 * The rows are therefore indistinguishable from real data.
 *
 * <p>Not {@code @Transactional}: each underlying service call runs in its own
 * transaction, and per-operation try/catch keeps one bad random draw from
 * aborting the whole run.
 */
@Service
@RequiredArgsConstructor
public class DataGenerationService {

    private static final Logger log = LoggerFactory.getLogger(DataGenerationService.class);

    private static final int MAX_EMAIL_ATTEMPTS = 10;

    private final SimulationProperties props;
    private final UserService userService;
    private final StoreItemService storeItemService;
    private final TaskService taskService;
    private final TaskCompletionService taskCompletionService;
    private final PurchaseService purchaseService;
    private final TransferService transferService;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public SimulationRunSummary runDailyGeneration() {
        Instant startedAt = Instant.now();
        SimulationFaker faker = new SimulationFaker(props.getSeed());
        log.info("[simulation] run starting (seed={})", props.getSeed());

        int[] skipped = {0};

        int usersCreated = generateUsers(faker, skipped);
        int itemsCreated = generateStoreItems(faker, skipped);
        int tasksCreated = generateTasks(faker, skipped);

        TransactionOutcome tx = generateTransactions(faker, skipped);

        Instant finishedAt = Instant.now();
        SimulationRunSummary summary = SimulationRunSummary.builder()
                .startedAt(startedAt)
                .finishedAt(finishedAt)
                .durationMs(Duration.between(startedAt, finishedAt).toMillis())
                .usersCreated(usersCreated)
                .storeItemsCreated(itemsCreated)
                .tasksCreated(tasksCreated)
                .activeUsersConsidered(tx.activeUsersConsidered)
                .taskCompletionsApproved(tx.completionsApproved)
                .purchases(tx.purchases)
                .transfers(tx.transfers)
                .skipped(skipped[0])
                .build();
        log.info(
                "[simulation] run finished in {}ms: users={}, items={}, tasks={}, earns={}, purchases={}, transfers={}, skipped={}",
                summary.getDurationMs(),
                summary.getUsersCreated(),
                summary.getStoreItemsCreated(),
                summary.getTasksCreated(),
                summary.getTaskCompletionsApproved(),
                summary.getPurchases(),
                summary.getTransfers(),
                summary.getSkipped());
        return summary;
    }

    private int generateUsers(SimulationFaker faker, int[] skipped) {
        int created = 0;
        for (int i = 0; i < props.getUsersPerRun(); i++) {
            SignupRequest req = uniqueUser(faker);
            if (req == null) {
                skipped[0]++;
                continue;
            }
            try {
                userService.signup(req);
                created++;
            } catch (RuntimeException e) {
                skipped[0]++;
                log.debug("[simulation] user signup skipped: {}", e.getMessage());
            }
        }
        return created;
    }

    /** Regenerates until the email is unused, or gives up after a few tries. */
    private SignupRequest uniqueUser(SimulationFaker faker) {
        for (int attempt = 0; attempt < MAX_EMAIL_ATTEMPTS; attempt++) {
            SignupRequest req = faker.newUser();
            if (!accountRepository.existsByEmailIgnoreCase(req.getEmail())) {
                return req;
            }
        }
        return null;
    }

    private int generateStoreItems(SimulationFaker faker, int[] skipped) {
        int created = 0;
        for (int i = 0; i < props.getStoreItemsPerRun(); i++) {
            try {
                storeItemService.create(faker.newStoreItem());
                created++;
            } catch (RuntimeException e) {
                skipped[0]++;
                log.debug("[simulation] store item skipped: {}", e.getMessage());
            }
        }
        return created;
    }

    private int generateTasks(SimulationFaker faker, int[] skipped) {
        int created = 0;
        for (int i = 0; i < props.getTasksPerRun(); i++) {
            try {
                taskService.create(faker.newTask());
                created++;
            } catch (RuntimeException e) {
                skipped[0]++;
                log.debug("[simulation] task skipped: {}", e.getMessage());
            }
        }
        return created;
    }

    private TransactionOutcome generateTransactions(SimulationFaker faker, int[] skipped) {
        TransactionOutcome outcome = new TransactionOutcome();

        List<Long> activeUserIds = activeNonAdminUserIds();
        if (activeUserIds.isEmpty()) {
            log.info("[simulation] no ACTIVE non-admin users yet — approve some users to generate transactions.");
            return outcome;
        }
        Collections.shuffle(activeUserIds, faker.rng());
        if (activeUserIds.size() > props.getMaxActiveUsersInTx()) {
            activeUserIds = activeUserIds.subList(0, props.getMaxActiveUsersInTx());
        }
        outcome.activeUsersConsidered = activeUserIds.size();

        List<TaskResponse> activeTasks = taskService.listActive();
        List<StoreItemResponse> activeItems = storeItemService.list(false, null);

        // Earning then spending, per user — earn must precede spend because
        // balance is derived from the ledger and purchases re-check it.
        for (Long userId : activeUserIds) {
            outcome.completionsApproved += earnForUser(userId, activeTasks, faker, skipped);
            outcome.purchases += spendForUser(userId, activeItems, faker, skipped);
        }

        outcome.transfers = generateTransfers(activeUserIds, faker, skipped);
        return outcome;
    }

    private int earnForUser(Long userId, List<TaskResponse> tasks, SimulationFaker faker, int[] skipped) {
        if (tasks.isEmpty()) {
            return 0;
        }
        List<TaskResponse> shuffled = new ArrayList<>(tasks);
        Collections.shuffle(shuffled, faker.rng());
        int attempts = Math.min(props.getMaxTasksPerUser(), shuffled.size());
        int approved = 0;
        for (int i = 0; i < attempts; i++) {
            TaskResponse task = shuffled.get(i);
            try {
                TaskCompletionResponse completion = taskCompletionService.complete(userId, task.getId());
                // MANUAL tasks land PENDING and need an explicit approval to pay out.
                if (completion.getStatus() == TaskCompletionStatus.PENDING) {
                    completion = taskCompletionService.approve(completion.getId());
                }
                if (completion.getStatus() == TaskCompletionStatus.APPROVED) {
                    approved++;
                }
            } catch (RuntimeException e) {
                // Duplicate completion, task flipped inactive, etc. — expected noise.
                skipped[0]++;
                log.debug("[simulation] task completion skipped for user {}: {}", userId, e.getMessage());
            }
        }
        return approved;
    }

    private int spendForUser(Long userId, List<StoreItemResponse> items, SimulationFaker faker, int[] skipped) {
        if (items.isEmpty()) {
            return 0;
        }
        long balance = currentBalance(userId);
        int purchases = 0;
        for (int i = 0; i < props.getMaxPurchasesPerUser(); i++) {
            long budget = balance;
            List<StoreItemResponse> affordable = items.stream()
                    .filter(it -> it.getPriceAmount() != null && it.getPriceAmount() <= budget)
                    .toList();
            if (affordable.isEmpty()) {
                break;
            }
            StoreItemResponse item = faker.pick(affordable);
            try {
                purchaseService.purchase(
                        userId, CreatePurchaseRequest.builder().storeItemId(item.getId()).build());
                balance -= item.getPriceAmount();
                purchases++;
            } catch (RuntimeException e) {
                // Out of stock, race on balance, etc. — stop trying for this user.
                skipped[0]++;
                log.debug("[simulation] purchase skipped for user {}: {}", userId, e.getMessage());
                break;
            }
        }
        return purchases;
    }

    private int generateTransfers(List<Long> activeUserIds, SimulationFaker faker, int[] skipped) {
        if (activeUserIds.size() < 2) {
            return 0;
        }
        int transfers = 0;
        for (int i = 0; i < props.getTransfersPerRun(); i++) {
            Long senderId = faker.pick(activeUserIds);
            Long recipientId = faker.pick(activeUserIds);
            if (senderId.equals(recipientId)) {
                continue;
            }
            long balance = currentBalance(senderId);
            if (balance < 1) {
                continue;
            }
            int amount = faker.intBetween(1, (int) Math.min(balance, Integer.MAX_VALUE));
            try {
                transferService.transfer(
                        senderId, TransferRequest.builder().recipientId(recipientId).amount(amount).build());
                transfers++;
            } catch (RuntimeException e) {
                skipped[0]++;
                log.debug("[simulation] transfer skipped {} -> {}: {}", senderId, recipientId, e.getMessage());
            }
        }
        return transfers;
    }

    private long currentBalance(Long userId) {
        Long balance = transactionRepository.sumSignedAmountByUserIdAndStatus(userId, TransactionStatus.COMPLETED);
        return balance == null ? 0L : balance;
    }

    /** ACTIVE accounts whose user is a regular USER (never ADMIN). */
    private List<Long> activeNonAdminUserIds() {
        List<Account> activeAccounts = accountRepository.findAllByAccountState(AccountState.ACTIVE);
        if (activeAccounts.isEmpty()) {
            return new ArrayList<>();
        }
        List<Long> userIds = activeAccounts.stream().map(Account::getUserId).toList();
        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return userIds.stream()
                .filter(id -> {
                    User u = usersById.get(id);
                    return u != null && u.getUserType() == UserType.USER;
                })
                .collect(Collectors.toCollection(ArrayList::new));
    }

    /** Mutable per-run tally for the transaction stage. */
    private static final class TransactionOutcome {
        int activeUsersConsidered;
        int completionsApproved;
        int purchases;
        int transfers;
    }
}
