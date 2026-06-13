package com.vektra.messaging;

import java.time.Instant;

/**
 * Published after a ledger row is committed (see {@link com.vektra.messaging.LedgerKafkaPublisher}).
 *
 * Field guide:
 *   - taskId / taskCompletionId  →  set when the row came from a task reward
 *   - transferId / counterpartyUserId →  set on TRANSFER_IN and TRANSFER_OUT rows
 *
 * New fields are additive: downstream consumers that only read the original
 * fields continue to work unchanged (Jackson tolerates unknown properties on
 * the producer side and the new ones simply appear in the JSON payload).
 */
public record LedgerTransactionRecordedEvent(
        String eventType,
        Long transactionId,
        Long userId,
        Long taskId,
        Long taskCompletionId,
        String transferId,
        Long counterpartyUserId,
        Integer amount,
        String transactionType,
        String transactionStatus,
        Instant createdAt) {

    public static final String TYPE = "LEDGER_TRANSACTION_RECORDED";

    /** Convenience constructor for task-reward callers that don't deal with transfers. */
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
                null,
                null,
                amount,
                transactionType,
                transactionStatus,
                createdAt);
    }

    /** Convenience constructor for transfer callers. */
    public LedgerTransactionRecordedEvent(
            Long transactionId,
            Long userId,
            String transferId,
            Long counterpartyUserId,
            Integer amount,
            String transactionType,
            String transactionStatus,
            Instant createdAt) {
        this(
                TYPE,
                transactionId,
                userId,
                null,
                null,
                transferId,
                counterpartyUserId,
                amount,
                transactionType,
                transactionStatus,
                createdAt);
    }
}
