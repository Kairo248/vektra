package com.vektra.controller;

import com.vektra.dto.response.SimulationRunSummary;
import com.vektra.service.simulation.DataGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Manual trigger for the daily data generator. Runs the full pipeline once and
 * returns a summary, independent of the {@code vektra.simulation.enabled} flag
 * (that flag only gates the scheduled cron).
 *
 * <p>Lives under {@code /v1/admin} alongside the other operator endpoints. Note
 * that Spring Security is currently {@code permitAll} (see SecurityConfig), so
 * this is open until admin auth is added — same caveat as the rest of /v1/admin.
 */
@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
public class SimulationController {

    private final DataGenerationService dataGenerationService;

    @PostMapping("/simulate")
    public SimulationRunSummary simulate() {
        return dataGenerationService.runDailyGeneration();
    }
}
