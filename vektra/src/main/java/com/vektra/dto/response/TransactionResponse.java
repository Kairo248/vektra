package com.vektra.dto.response;

import com.vektra.enums.TransactionStatus;
import com.vektra.enums.TransactionType;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {

    private Long id;
    private Long userId;
    private Long taskId;
    private Long taskCompletionId;
    /** UUID linking the two legs of a transfer; null on non-transfer rows. */
    private String transferId;
    /** Sender (on a TRANSFER_IN row) or recipient (on a TRANSFER_OUT row); null otherwise. */
    private Long counterpartyUserId;
    /** Counterparty's first name; null on non-transfer rows or if the user was removed. */
    private String counterpartyName;
    /** Counterparty's surname; null on non-transfer rows or if the user was removed. */
    private String counterpartySurname;
    private Integer amount;
    private TransactionType type;
    private TransactionStatus status;
    private Instant createdAt;
}
