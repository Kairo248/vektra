package com.vektra.enums;

/**
 * Direction & origin of a ledger row.
 *
 * Sign convention applied in queries (see TransactionRepository#sumSignedAmountByUserIdAndStatus)
 * and on the frontend wallet page:
 *   EARN, TRANSFER_IN   → credit  (+amount)
 *   SPEND, TRANSFER_OUT → debit   (-amount)
 *
 * A peer-to-peer transfer writes exactly two rows that share the same
 * {@code transferId} (UUID): one TRANSFER_OUT on the sender's user_id, one
 * TRANSFER_IN on the recipient's. The matching row's user_id is also copied
 * into {@code counterpartyUserId} on each leg so a single ledger query can
 * render "Sent to …" / "Received from …" without a self-join.
 */
public enum TransactionType {
    EARN,
    SPEND,
    TRANSFER_IN,
    TRANSFER_OUT
}
