package com.vektra.exception;

/**
 * Thrown when an operation requires a stored face embedding for the user but
 * none exists. Mapped to 401 with the same opaque body as
 * {@link FaceMatchFailedException} so the API never reveals whether a given
 * account has face login enabled.
 */
public class FaceNotEnrolledException extends RuntimeException {

    public FaceNotEnrolledException(String message) {
        super(message);
    }
}
