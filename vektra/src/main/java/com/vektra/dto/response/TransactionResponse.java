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
    private Integer amount;
    private TransactionType type;
    private TransactionStatus status;
    private Instant createdAt;
}
