package com.vektra.dto.response;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of a successful peer-to-peer transfer.
 *
 * Carries both Transaction IDs (the two legs of the double-entry write) and the
 * sender's post-transfer balance so the UI can update the wallet hero card
 * without a follow-up GET.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferResponse {

    /** UUID shared by both ledger rows; useful for support / reversal lookups. */
    private String transferId;

    private Long senderId;
    private Long recipientId;
    private Integer amount;

    /** Ledger ID of the sender's TRANSFER_OUT row. */
    private Long senderTransactionId;

    /** Ledger ID of the recipient's TRANSFER_IN row. */
    private Long recipientTransactionId;

    /** Sender's signed-sum balance after the transfer commits. */
    private Long senderBalanceAfter;

    private Instant createdAt;
}
