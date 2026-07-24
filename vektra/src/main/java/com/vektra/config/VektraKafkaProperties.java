package com.vektra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "vektra.kafka")
public class VektraKafkaProperties {

    private Admin admin = new Admin();
    private boolean auditConsumerEnabled = false;
    /**
     * Off by default so the app (and the data generator) run without a broker on
     * localhost:9092. When false, ledger events are still published in-process
     * but never sent to Kafka — avoiding a 60s producer metadata block when no
     * broker exists. Set true once a broker is running.
     */
    private boolean publisherEnabled = false;
    private Topics topics = new Topics();

    @Data
    public static class Admin {
        private boolean createTopics = true;
    }

    @Data
    public static class Topics {
        private String ledger = "vektra.ledger.events";
    }
}
