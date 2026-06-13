package com.vektra.exception;

/**
 * Thrown when a transfer request supplies a recipient email or name that
 * does not match the user identified by {@code recipientId} — the
 * "Confirmation of Payee" check failed. Mapped to HTTP 400.
 *
 * The message never reveals what the real value is (only "does not match"),
 * so the endpoint cannot be used to scrape real user emails/names by
 * guessing IDs.
 */
public class RecipientMismatchException extends RuntimeException {

    public RecipientMismatchException(String message) {
        super(message);
    }
}
