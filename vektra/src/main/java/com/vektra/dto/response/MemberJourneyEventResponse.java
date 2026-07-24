package com.vektra.dto.response;

import com.vektra.enums.MemberJourneyEventType;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberJourneyEventResponse {

    private Long id;
    private Long userId;
    private MemberJourneyEventType eventType;
    private Instant occurredAt;
    private String title;
    private String subtitle;
    private Integer amount;
    /** IN, OUT, or null for non-money events. */
    private String direction;
    private Long transactionId;
    private Long taskId;
    private String taskName;
    private Long purchaseId;
    private Long storeItemId;
    private String storeItemName;
    private String transferId;
    private Long counterpartyUserId;
    private String counterpartyDisplayName;
}
