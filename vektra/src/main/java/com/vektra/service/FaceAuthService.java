package com.vektra.service;

import com.vektra.config.VektraFaceProperties;
import com.vektra.dto.response.FaceStatusResponse;
import com.vektra.dto.response.SignupResponse;
import com.vektra.entity.FaceCredential;
import com.vektra.exception.FaceMatchFailedException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.repository.FaceCredentialRepository;
import com.vektra.repository.UserRepository;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Face-recognition authentication.
 *
 * <p>The browser is responsible for image capture and embedding extraction
 * (face-api.js, FaceNet-style 128-d, L2-normalized). This service only ever
 * sees the resulting float vector, so no biometric image bytes touch the
 * server. We persist the embedding as 128 × 4-byte big-endian float32 in
 * {@code face_credentials.embedding} and compare candidates with plain
 * Euclidean distance over the (normalized) vectors.
 *
 * <p>Login is 1:N: we scan every enrolled embedding and pick the closest. If
 * the closest is below {@link VektraFaceProperties#getMatchThreshold()} we
 * authenticate as that user; otherwise we throw {@link FaceMatchFailedException}.
 * Linear scan is intentional — at expected user counts it's well under 100ms,
 * and a vector index (FAISS / pgvector) is premature until profiling says so.
 *
 * <p><b>Known limitations of face-only login</b> (mitigations live elsewhere):
 * vulnerable to identical-twin / strong-lookalike collisions; vulnerable to
 * replay if you don't pair this with a server nonce; vulnerable to
 * photo/video spoof if you don't pair this with browser-side liveness.
 */
@Service
@RequiredArgsConstructor
@EnableConfigurationProperties(VektraFaceProperties.class)
public class FaceAuthService {

    private static final Logger log = LoggerFactory.getLogger(FaceAuthService.class);

    private final FaceCredentialRepository faceCredentialRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final VektraFaceProperties properties;

    /* ------------------------------------------------------------------ */
    /* Enrollment / management                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Persists (or replaces) the face embedding for {@code userId}. Idempotent:
     * re-enrolling overwrites the previous vector and bumps {@code updatedAt}.
     *
     * @throws ResourceNotFoundException if the user does not exist
     * @throws IllegalArgumentException if the embedding is malformed
     *         (wrong length, non-finite values, or norm outside tolerance)
     */
    @Transactional
    public void enroll(Long userId, float[] embedding) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }
        validateEmbedding(embedding);

        byte[] encoded = encode(embedding);
        FaceCredential credential = faceCredentialRepository.findByUserId(userId)
                .orElseGet(() -> FaceCredential.builder().userId(userId).build());
        credential.setEmbedding(encoded);
        faceCredentialRepository.save(credential);
        log.info("Enrolled face credential for user {}", userId);
    }

    @Transactional(readOnly = true)
    public FaceStatusResponse getStatus(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }
        Optional<FaceCredential> credential = faceCredentialRepository.findByUserId(userId);
        return FaceStatusResponse.builder()
                .enrolled(credential.isPresent())
                .enrolledAt(credential.map(FaceCredential::getCreatedAt).orElse(null))
                .build();
    }

    /**
     * Removes the face credential for {@code userId}. No-op if none exists —
     * the endpoint stays idempotent so the UI can call it without first
     * checking status.
     */
    @Transactional
    public void delete(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }
        if (faceCredentialRepository.existsByUserId(userId)) {
            faceCredentialRepository.deleteByUserId(userId);
            log.info("Deleted face credential for user {}", userId);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Login                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * 1:N face login. Loads every enrolled embedding once, finds the closest
     * candidate by Euclidean distance, and accepts it iff the distance is
     * strictly below {@link VektraFaceProperties#getMatchThreshold()}.
     *
     * <p>Failure modes — wrong-shape vector, no enrollments at all, or
     * best-match too far — collapse to a single
     * {@link FaceMatchFailedException} so the response body never reveals
     * whether any user is enrolled.
     */
    @Transactional(readOnly = true)
    public SignupResponse loginByFace(float[] candidate) {
        validateEmbedding(candidate);

        List<FaceCredential> all = faceCredentialRepository.findAll();
        if (all.isEmpty()) {
            throw new FaceMatchFailedException("No enrolled faces");
        }

        Long bestUserId = null;
        double bestDistance = Double.POSITIVE_INFINITY;
        for (FaceCredential credential : all) {
            float[] stored = decode(credential.getEmbedding());
            double distance = euclidean(candidate, stored);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestUserId = credential.getUserId();
            }
        }

        if (bestUserId == null || bestDistance >= properties.getMatchThreshold()) {
            log.debug(
                    "Face login rejected: bestDistance={} threshold={}",
                    bestDistance,
                    properties.getMatchThreshold());
            throw new FaceMatchFailedException("Face not recognized");
        }

        log.info(
                "Face login accepted for user {} (distance={}, threshold={})",
                bestUserId,
                bestDistance,
                properties.getMatchThreshold());
        return authService.buildAggregate(bestUserId);
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                             */
    /* ------------------------------------------------------------------ */

    private void validateEmbedding(float[] embedding) {
        if (embedding == null || embedding.length != properties.getEmbeddingDimension()) {
            throw new IllegalArgumentException(
                    "Embedding must contain exactly " + properties.getEmbeddingDimension() + " floats");
        }
        double sumSquares = 0.0;
        for (float v : embedding) {
            if (!Float.isFinite(v)) {
                throw new IllegalArgumentException("Embedding contains non-finite values");
            }
            sumSquares += (double) v * (double) v;
        }
        double norm = Math.sqrt(sumSquares);
        if (Math.abs(norm - 1.0) > properties.getNormTolerance()) {
            throw new IllegalArgumentException(
                    "Embedding must be L2-normalized (norm was " + norm + ")");
        }
    }

    /**
     * Pack 128 float32s into a 512-byte big-endian buffer. We pin endianness so
     * binary stored on one host can be decoded on another with no surprises.
     */
    private byte[] encode(float[] embedding) {
        ByteBuffer buffer = ByteBuffer
                .allocate(embedding.length * Float.BYTES)
                .order(ByteOrder.BIG_ENDIAN);
        for (float v : embedding) {
            buffer.putFloat(v);
        }
        return buffer.array();
    }

    private float[] decode(byte[] bytes) {
        if (bytes.length != properties.getEmbeddingDimension() * Float.BYTES) {
            // The DB column is VARBINARY(512) with NOT NULL, so this should be
            // unreachable in practice. If it ever fires we want to know loudly.
            throw new IllegalStateException(
                    "Stored embedding has wrong byte length: " + bytes.length);
        }
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.BIG_ENDIAN);
        float[] out = new float[properties.getEmbeddingDimension()];
        for (int i = 0; i < out.length; i++) {
            out[i] = buffer.getFloat();
        }
        return out;
    }

    /**
     * Plain Euclidean distance. Both vectors are assumed L2-normalized so
     * sqrt(2 - 2·cos(θ)) and the textbook L2 distance agree, and the tuned
     * threshold (~0.5) is meaningful regardless of magnitude drift.
     */
    private static double euclidean(float[] a, float[] b) {
        double sum = 0.0;
        for (int i = 0; i < a.length; i++) {
            double diff = (double) a[i] - (double) b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
}
