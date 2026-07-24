package com.vektra.dto.response;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Counts produced by one run of the daily data generator. Returned by the
 * manual trigger endpoint and logged by the scheduler.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimulationRunSummary {

    private Instant startedAt;
    private Instant finishedAt;
    private long durationMs;

    /** New PENDING users created (admin approval inbox). */
    private int usersCreated;

    private int storeItemsCreated;
    private int tasksCreated;

    /** ACTIVE users that were eligible to drive transactions. */
    private int activeUsersConsidered;

    private int taskCompletionsApproved;
    private int purchases;
    private int transfers;

    /** Non-fatal issues that were skipped (e.g. insufficient balance draws). */
    private int skipped;
}
