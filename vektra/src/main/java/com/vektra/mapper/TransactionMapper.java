package com.vektra.mapper;

import com.vektra.dto.response.TransactionResponse;
import com.vektra.entity.Transaction;
import com.vektra.entity.User;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(Transaction entity) {
        return toResponse(entity, null);
    }

    /**
     * Variant that fills in the counterparty's display name when known. The caller is
     * responsible for batch-loading counterparty users (one {@code findAllById} call for
     * the whole list) so the API stays N+1-free for transfer-heavy ledgers.
     *
     * <p>{@code counterparty} may be {@code null} on non-transfer rows or when the
     * counterparty user has since been removed; in those cases name/surname stay null
     * and the frontend falls back to "user #&lt;id&gt;".
     */
    public TransactionResponse toResponse(Transaction entity, User counterparty) {
        if (entity == null) {
            return null;
        }
        return TransactionResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .taskId(entity.getTaskId())
                .taskCompletionId(entity.getTaskCompletionId())
                .transferId(entity.getTransferId())
                .counterpartyUserId(entity.getCounterpartyUserId())
                .counterpartyName(counterparty != null ? counterparty.getName() : null)
                .counterpartySurname(counterparty != null ? counterparty.getSurname() : null)
                .amount(entity.getAmount())
                .type(entity.getType())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
