package com.vektra.exception;

import com.vektra.dto.error.ApiError;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(baseError(HttpStatus.NOT_FOUND, ex.getMessage()));
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiError> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(baseError(HttpStatus.CONFLICT, ex.getMessage()));
    }

    @ExceptionHandler(InvalidAccountStateException.class)
    public ResponseEntity<ApiError> handleInvalidAccountState(InvalidAccountStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(baseError(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(AccountNotActiveException.class)
    public ResponseEntity<ApiError> handleAccountNotActive(AccountNotActiveException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(baseError(HttpStatus.FORBIDDEN, ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(baseError(HttpStatus.UNAUTHORIZED, ex.getMessage()));
    }

    /**
     * Both face-auth failure modes deliberately collapse to the same opaque
     * 401 body: an attacker enumerating accounts must not be able to tell
     * "no face enrolled for this user" from "face didn't match".
     */
    @ExceptionHandler({FaceNotEnrolledException.class, FaceMatchFailedException.class})
    public ResponseEntity<ApiError> handleFaceAuthFailure(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(baseError(HttpStatus.UNAUTHORIZED, "Face not recognized"));
    }

    @ExceptionHandler(RateLimitedException.class)
    public ResponseEntity<ApiError> handleRateLimited(RateLimitedException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(baseError(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage()));
    }

    @ExceptionHandler(DuplicateTaskCompletionException.class)
    public ResponseEntity<ApiError> handleDuplicateTaskCompletion(DuplicateTaskCompletionException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(baseError(HttpStatus.CONFLICT, ex.getMessage()));
    }

    @ExceptionHandler(InvalidTaskStateException.class)
    public ResponseEntity<ApiError> handleInvalidTaskState(InvalidTaskStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(baseError(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(InvalidTaskCompletionStateException.class)
    public ResponseEntity<ApiError> handleInvalidTaskCompletionState(InvalidTaskCompletionStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(baseError(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<ApiError> handleInsufficientBalance(InsufficientBalanceException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(baseError(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage()));
    }

    @ExceptionHandler(RecipientMismatchException.class)
    public ResponseEntity<ApiError> handleRecipientMismatch(RecipientMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(baseError(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(baseError(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> fieldErrors.put(err.getField(), err.getDefaultMessage()));
        ApiError body = ApiError.builder()
                .timestamp(Instant.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(HttpStatus.BAD_REQUEST.getReasonPhrase())
                .message("Validation failed")
                .fieldErrors(fieldErrors)
                .build();
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(baseError(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred"));
    }

    private static ApiError baseError(HttpStatus status, String message) {
        return ApiError.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .build();
    }
}
