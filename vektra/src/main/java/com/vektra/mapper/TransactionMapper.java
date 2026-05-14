package com.vektra.mapper;

import com.vektra.dto.response.TransactionResponse;
import com.vektra.entity.Transaction;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(Transaction entity) {
        if (entity == null) {
            return null;
        }
        return TransactionResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .taskId(entity.getTaskId())
                .taskCompletionId(entity.getTaskCompletionId())
                .amount(entity.getAmount())
                .type(entity.getType())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
