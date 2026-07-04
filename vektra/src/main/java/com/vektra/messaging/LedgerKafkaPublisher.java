package com.vektra.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vektra.config.VektraKafkaProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Ships committed ledger rows to Kafka. Gated on
 * {@code vektra.kafka.publisher-enabled} (default false) so that, without a
 * running broker, the bean isn't created and after-commit publishing can't block
 * the request thread on producer metadata (default 60s). Enable it once a broker
 * is available.
 */
@Component
@ConditionalOnProperty(name = "vektra.kafka.publisher-enabled", havingValue = "true")
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
