package com.vektra.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Body for {@code POST /v1/auth/face-login}. Same shape as
 * {@link FaceEnrollRequest} today; kept as a separate type so we can later
 * add fields (server-issued nonce, liveness signals) without churning the
 * enrollment contract.
 */
@Data
public class FaceLoginRequest {

    @NotNull
    @Size(min = 128, max = 128, message = "embedding must contain exactly 128 floats")
    private float[] embedding;
}
