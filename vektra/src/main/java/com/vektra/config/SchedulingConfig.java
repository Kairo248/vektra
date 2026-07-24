package com.vektra.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables Spring's {@code @Scheduled} support (used by the daily data-generation
 * scheduler) and binds {@link SimulationProperties}.
 */
@Configuration
@EnableScheduling
@EnableConfigurationProperties(SimulationProperties.class)
public class SchedulingConfig {
}
