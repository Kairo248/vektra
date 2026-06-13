package com.vektra.controller;

import com.vektra.config.VektraFaceProperties;
import com.vektra.exception.RateLimitedException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Per-IP rate limiter for {@code POST /v1/auth/face-login}.
 *
 * <p>Hand-rolled (rather than Bucket4j) to avoid adding a Maven dependency for
 * one endpoint; it's a fixed-window counter with two parallel windows (per
 * minute and per hour). That's deliberately less precise than a sliding window —
 * a burst right at the boundary briefly allows up to 2× the limit — but it's
 * lock-free in the common path, has no transitive deps, and is plenty against
 * the brute-force shape we actually care about (slow vector grinding).
 *
 * <p>Storage is in-memory, so each backend replica enforces the limit
 * independently. Acceptable for our current single-instance deployment;
 * promote to a shared store (Redis) when we run multiple replicas.
 *
 * <p>Note that face login goes through Nginx, so the original client IP lives
 * in {@code X-Forwarded-For}. We honor the leftmost entry there before
 * falling back to {@code remoteAddr}.
 */
@Component
@RequiredArgsConstructor
@EnableConfigurationProperties(VektraFaceProperties.class)
public class FaceLoginRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(FaceLoginRateLimiter.class);

    private static final long MINUTE_NANOS = Duration.ofMinutes(1).toNanos();
    private static final long HOUR_NANOS = Duration.ofHours(1).toNanos();

    /** Soft cap. Past this size we log a warning — an attacker farming IPs would
     *  show up here. The map is never auto-evicted in this cut; reset by restart. */
    private static final int MAP_WARN_SIZE = 10_000;

    private final VektraFaceProperties properties;

    private final Map<String, Counters> byIp = new ConcurrentHashMap<>();

    public void acquireOrThrow(HttpServletRequest http) {
        String ip = clientIp(http);
        Counters counters = byIp.computeIfAbsent(ip, k -> new Counters());
        long now = System.nanoTime();
        synchronized (counters) {
            counters.rollIfExpired(now);
            int perMinute = properties.getRateLimit().getPerMinute();
            int perHour = properties.getRateLimit().getPerHour();
            if (counters.minute >= perMinute || counters.hour >= perHour) {
                log.warn(
                        "Face-login rate limit hit for {} (minute={}/{} hour={}/{})",
                        ip,
                        counters.minute,
                        perMinute,
                        counters.hour,
                        perHour);
                throw new RateLimitedException(
                        "Too many face-login attempts. Please wait and try again.");
            }
            counters.minute++;
            counters.hour++;
        }
        if (byIp.size() == MAP_WARN_SIZE) {
            log.warn("Face-login rate-limit map reached {} entries; consider eviction", MAP_WARN_SIZE);
        }
    }

    /**
     * Best-effort client IP extraction. Trusts the leftmost
     * {@code X-Forwarded-For} entry because in this deployment Nginx is the
     * only public hop and rewrites the header.
     */
    private static String clientIp(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        return http.getRemoteAddr();
    }

    /** Two fixed-window counters per IP. Mutated only under {@code synchronized(this)}. */
    private static final class Counters {
        int minute;
        int hour;
        long minuteWindowStart = System.nanoTime();
        long hourWindowStart = minuteWindowStart;

        void rollIfExpired(long nowNanos) {
            if (nowNanos - minuteWindowStart >= MINUTE_NANOS) {
                minute = 0;
                minuteWindowStart = nowNanos;
            }
            if (nowNanos - hourWindowStart >= HOUR_NANOS) {
                hour = 0;
                hourWindowStart = nowNanos;
            }
        }
    }
}
