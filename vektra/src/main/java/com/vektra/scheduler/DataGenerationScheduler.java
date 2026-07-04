package com.vektra.scheduler;

import com.vektra.config.SimulationProperties;
import com.vektra.service.simulation.DataGenerationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Fires the daily data generator on {@code vektra.simulation.cron}.
 *
 * <p>The method is always scheduled, but no-ops unless
 * {@code vektra.simulation.enabled=true}. This keeps the cron expression static
 * (required by {@code @Scheduled}) while letting the flag turn generation on/off
 * without a redeploy (e.g. via application-local.yml).
 */
@Component
@RequiredArgsConstructor
public class DataGenerationScheduler {

    private static final Logger log = LoggerFactory.getLogger(DataGenerationScheduler.class);

    private final SimulationProperties props;
    private final DataGenerationService dataGenerationService;

    @Scheduled(cron = "${vektra.simulation.cron}")
    public void scheduledRun() {
        if (!props.isEnabled()) {
            return;
        }
        log.info("[simulation] scheduled trigger fired");
        dataGenerationService.runDailyGeneration();
    }
}
