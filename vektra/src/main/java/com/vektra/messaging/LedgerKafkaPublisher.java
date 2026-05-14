package com.vektra.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vektra.config.VektraKafkaProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class LedgerKafkaPublisher {

    private static final Logger log = LoggerFactory.getLogger(LedgerKafkaPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final VektraKafkaProperties vektraKafkaProperties;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishAfterCommit(LedgerTransactionRecordedEvent event) {
        try {
            String json = objectMapper.writeValueAsString(event);
            String topic = vektraKafkaProperties.getTopics().getLedger();
            kafkaTemplate
                    .send(topic, String.valueOf(event.userId()), json)
                    .whenComplete(
                            (result, ex) -> {
                                if (ex != null) {
                                    log.error("Failed to publish ledger event to topic {}", topic, ex);
                                }
                            });
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize ledger event", e);
        }
    }
}
