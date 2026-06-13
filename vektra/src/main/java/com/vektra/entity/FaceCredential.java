package com.vektra.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Face-recognition credential bound to a single user.
 *
 * <p>Stored as a fixed-size 512-byte blob (128 IEEE-754 single-precision floats,
 * big-endian). The vector is L2-normalized at enrollment so we can compare with
 * Euclidean distance directly without re-normalizing on read. Kept in its own
 * table so a GDPR "right to be forgotten" is a single row delete and so any
 * future credential type (fingerprint, voice, WebAuthn) can live alongside it
 * without polluting the {@code accounts} schema.
 */
@Entity
@Table(name = "face_credentials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaceCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /**
     * 128 × 4-byte float32, big-endian. We pin the column type to
     * {@code VARBINARY(512)} so MySQL doesn't promote it to a TEXT/BLOB type
     * (which would block in-row storage) and so length is enforced at the
     * driver layer in addition to our application-side validation.
     */
    @Column(nullable = false, columnDefinition = "VARBINARY(512)")
    private byte[] embedding;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
