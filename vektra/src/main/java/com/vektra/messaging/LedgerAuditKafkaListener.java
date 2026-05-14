package com.vektra.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Optional local listener to verify events (enable {@code vektra.kafka.audit-consumer-enabled=true}).
 */
@Component
@ConditionalOnProperty(name = "vektra.kafka.audit-consumer-enabled", havingValue = "true")
public class LedgerAuditKafkaListener {

    private static final Logger log = LoggerFactory.getLogger(LedgerAuditKafkaListener.class);

    @KafkaListener(topics = "${vektra.kafka.topics.ledger}", groupId = "${spring.kafka.consumer.group-id}")
    public void onLedgerEvent(String payload) {
        log.info("Kafka ledger event received: {}", payload);
    }
}
