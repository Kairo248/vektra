package com.vektra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tunables for face-recognition login.
 *
 * <p>{@code matchThreshold} is the maximum Euclidean distance between two
 * L2-normalized 128-d face embeddings that we still consider "the same
 * person". face-api.js defaults to 0.6 for 1:1 verification; we run 1:N
 * (any user) so we tighten the bar to 0.5 by default — a 1:N system pays
 * for a permissive threshold with false positives, which here means
 * impersonation. Override per environment in {@code application-local.yml}
 * if you have ground-truth pairs and want to retune.
 *
 * <p>{@code embeddingDimension} is fixed at 128 for face-api.js but kept
 * configurable so a future swap to a 512-d model only changes config.
 */
@Data
@ConfigurationProperties(prefix = "vektra.face")
public class VektraFaceProperties {

    private double matchThreshold = 0.50;
    private int embeddingDimension = 128;

    /**
     * Maximum allowed drift of the L2 norm from 1.0 at enrollment / login. Vectors
     * whose norm falls outside [1 - tolerance, 1 + tolerance] are rejected as
     * "not normalized" — catches both broken clients and crude probing attempts.
     */
    private double normTolerance = 0.05;

    private RateLimit rateLimit = new RateLimit();

    @Data
    public static class RateLimit {
        /** Max successful or failed face-login attempts per source IP per 60 seconds. */
        private int perMinute = 5;
        /** Max successful or failed face-login attempts per source IP per 3600 seconds. */
        private int perHour = 30;
    }
}
