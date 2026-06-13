package com.vektra.exception;

/**
 * Thrown when no enrolled face is close enough (under the configured
 * Euclidean threshold) to the embedding presented at login. Mapped to 401
 * with an opaque body so attackers can't infer match scores.
 */
public class FaceMatchFailedException extends RuntimeException {

    public FaceMatchFailedException(String message) {
        super(message);
    }
}
