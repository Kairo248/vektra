package com.vektra.exception;

/**
 * Thrown when a caller exceeds a per-IP rate limit (currently used only by
 * face login). Mapped to HTTP 429 Too Many Requests.
 */
public class RateLimitedException extends RuntimeException {

    public RateLimitedException(String message) {
        super(message);
    }
}
