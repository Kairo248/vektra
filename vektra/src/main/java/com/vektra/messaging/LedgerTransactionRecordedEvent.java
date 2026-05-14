package com.vektra.messaging;

import java.time.Instant;

/**
 * Published after a ledger row is committed (see {@link com.vektra.messaging.LedgerKafkaPublisher}).
 */
public record LedgerTransactionRecordedEvent(
        String eventType,
        Long transactionId,
        Long userId,
        Long taskId,
        Long taskCompletionId,
        Integer amount,
        String transactionType,
        String transactionStatus,
        Instant createdAt) {

    public static final String TYPE = "LEDGER_TRANSACTION_RECORDED";

    public LedgerTransactionRecordedEvent(
            Long transactionId,
            Long userId,
            Long taskId,
            Long taskCompletionId,
            Integer amount,
            String transactionType,
            String transactionStatus,
            Instant createdAt) {
        this(
                TYPE,
                transactionId,
                userId,
                taskId,
                taskCompletionId,
                amount,
                transactionType,
                transactionStatus,
                createdAt);
    }
}
