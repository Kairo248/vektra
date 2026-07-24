package com.vektra.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vektra.dto.journey.JourneyEventPayload;
import com.vektra.dto.response.MemberJourneyEventResponse;
import com.vektra.entity.MemberJourneyEvent;
import com.vektra.enums.MemberJourneyEventType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MemberJourneyMapper {

    private final ObjectMapper objectMapper;

    public MemberJourneyEventResponse toResponse(MemberJourneyEvent entity) {
        JourneyEventPayload payload = parsePayload(entity.getPayloadJson());
        return MemberJourneyEventResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .eventType(entity.getEventType())
                .occurredAt(entity.getOccurredAt())
                .title(buildTitle(entity.getEventType(), payload))
                .subtitle(buildSubtitle(entity.getEventType(), payload))
                .amount(payload != null ? payload.getAmount() : null)
                .direction(payload != null ? payload.getDirection() : null)
                .transactionId(payload != null ? payload.getTransactionId() : null)
                .taskId(payload != null ? payload.getTaskId() : null)
                .taskName(payload != null ? payload.getTaskName() : null)
                .purchaseId(payload != null ? payload.getPurchaseId() : null)
                .storeItemId(payload != null ? payload.getStoreItemId() : null)
                .storeItemName(payload != null ? payload.getStoreItemName() : null)
                .transferId(payload != null ? payload.getTransferId() : null)
                .counterpartyUserId(payload != null ? payload.getCounterpartyUserId() : null)
                .counterpartyDisplayName(counterpartyDisplay(payload))
                .build();
    }

    public String serializePayload(JourneyEventPayload payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialize journey payload", e);
        }
    }

    JourneyEventPayload parsePayload(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, JourneyEventPayload.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static String counterpartyDisplay(JourneyEventPayload payload) {
        if (payload == null || payload.getCounterpartyUserId() == null) {
            return null;
        }
        if (payload.getCounterpartyName() != null) {
            String surname = payload.getCounterpartySurname() != null ? payload.getCounterpartySurname() : "";
            return (payload.getCounterpartyName() + " " + surname).trim();
        }
        return "user #" + payload.getCounterpartyUserId();
    }

    private static String buildTitle(MemberJourneyEventType type, JourneyEventPayload p) {
        return switch (type) {
            case SIGNUP -> "Joined Vektra";
            case ACCOUNT_ACTIVATED -> "Account activated";
            case REWARD_EARNED -> "Earned Vektras";
            case PURCHASE -> "Store purchase";
            case TRANSFER_OUT -> "Sent Vektras";
            case TRANSFER_IN -> "Received Vektras";
        };
    }

    private static String buildSubtitle(MemberJourneyEventType type, JourneyEventPayload p) {
        if (p == null) {
            return null;
        }
        return switch (type) {
            case SIGNUP -> p.getEmail() != null ? p.getEmail() : "New member registration";
            case ACCOUNT_ACTIVATED -> "Admin approved — can earn and spend";
            case REWARD_EARNED -> p.getTaskName() != null ? "Task: " + p.getTaskName() : "Task reward";
            case PURCHASE -> p.getStoreItemName() != null ? p.getStoreItemName() : "Store item";
            case TRANSFER_OUT -> {
                String cp = counterpartyDisplay(p);
                yield cp != null ? "To " + cp : "Peer transfer";
            }
            case TRANSFER_IN -> {
                String cp = counterpartyDisplay(p);
                yield cp != null ? "From " + cp : "Peer transfer";
            }
        };
    }
}
