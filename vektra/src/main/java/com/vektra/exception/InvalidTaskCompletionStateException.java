package com.vektra.exception;

public class InvalidTaskCompletionStateException extends RuntimeException {

    public InvalidTaskCompletionStateException(String message) {
        super(message);
    }
}
