package com.vektra.controller;

import com.vektra.dto.request.FaceEnrollRequest;
import com.vektra.dto.response.FaceStatusResponse;
import com.vektra.service.FaceAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Per-user face credential management. Lives under {@code /v1/users/{userId}/face}
 * to mirror the rest of {@code UserController}'s sub-resource layout
 * ({@code /v1/users/{id}/account}, {@code /v1/users/{id}/wallet}, …).
 *
 * <p>Public face login (1:N) lives separately on
 * {@code POST /v1/auth/face-login} so the route surface mirrors the existing
 * password login endpoint.
 */
@RestController
@RequestMapping("/v1/users/{userId}/face")
@RequiredArgsConstructor
public class FaceCredentialController {

    private final FaceAuthService faceAuthService;

    /**
     * Idempotent enrollment / re-enrollment. Replacing the stored embedding
     * is the supported way to "re-train" — there's no separate update endpoint.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void enroll(
            @PathVariable Long userId,
            @Valid @RequestBody FaceEnrollRequest request) {
        faceAuthService.enroll(userId, request.getEmbedding());
    }

    @GetMapping
    public FaceStatusResponse status(@PathVariable Long userId) {
        return faceAuthService.getStatus(userId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long userId) {
        faceAuthService.delete(userId);
    }
}
