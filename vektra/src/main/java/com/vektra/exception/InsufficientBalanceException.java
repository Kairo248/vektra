package com.vektra.exception;

/**
 * Thrown when a debit (transfer-out, spend) would take a user's signed
 * ledger balance below zero. Mapped to HTTP 422 in {@link GlobalExceptionHandler}
 * because the request is well-formed but violates a business rule.
 */
public class InsufficientBalanceException extends RuntimeException {

    public InsufficientBalanceException(String message) {
        super(message);
    }
}
