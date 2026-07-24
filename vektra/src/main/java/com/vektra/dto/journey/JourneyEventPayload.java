package com.vektra.dto.journey;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Serializable snapshot stored in {@code member_journey_events.payload_json}. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyEventPayload {

    private Integer amount;
    /** IN = credit to user, OUT = debit from user. */
    private String direction;
    private Long transactionId;
    private Long taskId;
    private String taskName;
    private Long taskCompletionId;
    private Long purchaseId;
    private Long storeItemId;
    private String storeItemName;
    private String transferId;
    private Long counterpartyUserId;
    private String counterpartyName;
    private String counterpartySurname;
    private String email;
}
