package com.vektra.exception;

public class DuplicateTaskCompletionException extends RuntimeException {

    public DuplicateTaskCompletionException(String message) {
        super(message);
    }
}
