package com.vektra.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Body for {@code POST /v1/users/{userId}/face}. Carries the 128-d face
 * embedding the browser computed with face-api.js (FaceNet-style).
 *
 * <p>Vectors must be L2-normalized client-side. The service layer rejects
 * anything whose Euclidean norm drifts more than 0.05 away from 1.0 — that
 * catches both broken clients and obvious random-vector probes.
 */
@Data
public class FaceEnrollRequest {

    @NotNull
    @Size(min = 128, max = 128, message = "embedding must contain exactly 128 floats")
    private float[] embedding;
}
