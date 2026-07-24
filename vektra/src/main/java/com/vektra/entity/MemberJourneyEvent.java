package com.vektra.entity;

import com.vektra.enums.JourneySourceType;
import com.vektra.enums.MemberJourneyEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "member_journey_events",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_journey_source_event",
                        columnNames = {"source_type", "source_id", "event_type"}),
        indexes = @Index(name = "idx_journey_user_occurred", columnList = "user_id, occurred_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberJourneyEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 32)
    private MemberJourneyEventType eventType;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 32)
    private JourneySourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    /** JSON snapshot for display enrichment (amounts, names, ids). */
    @Column(name = "payload_json", columnDefinition = "json")
    private String payloadJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
