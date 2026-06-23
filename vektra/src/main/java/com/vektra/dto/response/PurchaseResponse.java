package com.vektra.dto.response;

import com.vektra.enums.PurchaseStatus;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseResponse {

    private Long id;
    private Long userId;
    private Long storeItemId;
    private String storeItemName;
    private Integer amountPaid;
    private PurchaseStatus status;
    private Long transactionId;
    private Long balanceAfter;
    private Instant createdAt;
}
