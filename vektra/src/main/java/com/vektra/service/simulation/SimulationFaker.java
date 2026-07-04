package com.vektra.service.simulation;

import com.vektra.dto.request.CreateStoreItemRequest;
import com.vektra.dto.request.CreateTaskRequest;
import com.vektra.dto.request.SignupRequest;
import com.vektra.enums.EarnType;
import com.vektra.enums.StoreItemStatus;
import com.vektra.enums.TaskStatus;
import java.util.List;
import java.util.Random;
import net.datafaker.Faker;

/**
 * Produces realistic, synthetic domain drafts for a single simulation run.
 *
 * <p>Instantiated once per run with a shared {@link Random} so the whole run
 * (fake data <em>and</em> the selection logic in the orchestrator) can be made
 * reproducible from a single seed. Deliberately NOT a Spring bean: its state is
 * the per-run RNG, and one instance per run keeps that state isolated.
 *
 * <p>Nothing here tags the output as synthetic — emails look like real consumer
 * addresses, names/products/tasks read naturally — so the resulting rows are
 * indistinguishable from user-generated data.
 */
public class SimulationFaker {

    /** Common consumer email providers so generated addresses look real. */
    private static final List<String> EMAIL_DOMAINS =
            List.of("gmail.com", "outlook.com", "yahoo.com", "icloud.com", "proton.me", "hotmail.com");

    /** Verb templates that read like real reward tasks. */
    private static final List<String> TASK_TEMPLATES = List.of(
            "Complete your profile",
            "Refer a friend",
            "Watch the intro video",
            "Take the weekly survey",
            "Verify your email address",
            "Share on social media",
            "Read the community guidelines",
            "Rate a store item",
            "Invite a teammate",
            "Enable two-factor authentication",
            "Write a product review",
            "Join the newsletter");

    private static final List<String> STORE_CATEGORIES = List.of(
            "Electronics", "Apparel", "Home", "Gaming", "Books", "Fitness", "Beauty", "Outdoors", "Toys", "Office");

    private final Faker faker;
    private final Random rng;

    public SimulationFaker(long seed) {
        this.rng = seed == 0 ? new Random() : new Random(seed);
        this.faker = new Faker(rng);
    }

    /** Exposed so the orchestrator draws from the same RNG stream as the fakes. */
    public Random rng() {
        return rng;
    }

    /** Inclusive-lower, inclusive-upper random int. */
    public int intBetween(int minInclusive, int maxInclusive) {
        return minInclusive + rng.nextInt(Math.max(1, maxInclusive - minInclusive + 1));
    }

    /** True with the given probability (0.0–1.0). */
    public boolean chance(double probability) {
        return rng.nextDouble() < probability;
    }

    public <T> T pick(List<T> options) {
        return options.get(rng.nextInt(options.size()));
    }

    /**
     * A fresh signup draft. The email embeds a random suffix so raw collisions
     * are unlikely; the caller still guards with an existence check and retries
     * via {@link #newUser()} if needed.
     */
    public SignupRequest newUser() {
        String first = faker.name().firstName();
        String last = faker.name().lastName();
        String localPart = sanitize(first) + "." + sanitize(last) + intBetween(1, 9999);
        String email = localPart + "@" + pick(EMAIL_DOMAINS);
        return SignupRequest.builder()
                .name(first)
                .surname(last)
                .email(email)
                // Fixed valid password (>= 8 chars); stored hashed, never surfaced.
                .password("Vektra#Sim1")
                .build();
    }

    public CreateStoreItemRequest newStoreItem() {
        String name = faker.commerce().productName();
        String description = faker.lorem().sentence(intBetween(8, 16));
        int price = intBetween(20, 2000);
        // ~30% unlimited stock (null), otherwise a finite quantity.
        Integer stock = chance(0.30) ? null : intBetween(1, 200);
        String category = pick(STORE_CATEGORIES);
        return CreateStoreItemRequest.builder()
                .name(trimTo(name, 200))
                .description(trimTo(description, 2000))
                .priceAmount(price)
                .stock(stock)
                .category(category)
                .status(StoreItemStatus.ACTIVE)
                .build();
    }

    public CreateTaskRequest newTask() {
        String name = pick(TASK_TEMPLATES);
        String description = faker.lorem().sentence(intBetween(10, 20));
        int reward = intBetween(10, 500);
        // Mostly AUTOMATIC so completions self-approve and earn immediately.
        EarnType earnType = chance(0.7) ? EarnType.AUTOMATIC : EarnType.MANUAL;
        return CreateTaskRequest.builder()
                .name(trimTo(name, 200))
                .description(trimTo(description, 2000))
                .rewardAmount(reward)
                .earnType(earnType)
                .status(TaskStatus.ACTIVE)
                .build();
    }

    private static String sanitize(String s) {
        return s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private static String trimTo(String s, int max) {
        String t = s.trim();
        return t.length() <= max ? t : t.substring(0, max);
    }
}
