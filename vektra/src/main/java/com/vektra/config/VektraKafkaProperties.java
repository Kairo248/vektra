package com.vektra.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "vektra.kafka")
public class VektraKafkaProperties {

    private Admin admin = new Admin();
    private boolean auditConsumerEnabled = false;
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
