package com.vektra.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.Setter;

/**
 * Tunables for the daily synthetic-data generator (see
 * {@code com.vektra.service.simulation.DataGenerationService}).
 *
 * <p>All generated rows go through the normal domain services, so they are
 * indistinguishable from real data. These knobs only control volume, timing
 * and reproducibility of a run.
 */
@ConfigurationProperties(prefix = "vektra.simulation")
@Getter
@Setter
public class SimulationProperties {

    /** Gates only the {@code @Scheduled} cron; the manual endpoint always works. */
    private boolean enabled = false;

    /** Spring cron expression for the daily run. */
    private String cron = "0 0 3 * * *";

    /** New PENDING users created per run (admin approval inbox). */
    private int usersPerRun = 25;

    private int storeItemsPerRun = 40;

    private int tasksPerRun = 6;

    /** Upper bound on ACTIVE users used to drive transactions each run. */
    private int maxActiveUsersInTx = 40;

    /** Upper bound on task completions attempted per active user. */
    private int maxTasksPerUser = 4;

    /** Upper bound on purchases attempted per active user (affordability permitting). */
    private int maxPurchasesPerUser = 3;

    /** Peer-to-peer transfers attempted per run (affordability permitting). */
    private int transfersPerRun = 15;

    /** 0 = fresh randomness each run; non-zero = reproducible. */
    private long seed = 0;
}
