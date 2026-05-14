package com.vektra.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableKafka
@EnableConfigurationProperties(VektraKafkaProperties.class)
public class KafkaConfig {

    @Bean
    @ConditionalOnProperty(
            name = "vektra.kafka.admin.create-topics",
            havingValue = "true",
            matchIfMissing = true)
    public NewTopic ledgerTopic(VektraKafkaProperties properties) {
        return TopicBuilder.name(properties.getTopics().getLedger())
                .partitions(1)
                .replicas(1)
                .build();
    }
}
