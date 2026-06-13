package com.vektra.controller;

import com.vektra.dto.request.ChangePasswordRequest;
import com.vektra.dto.request.FaceLoginRequest;
import com.vektra.dto.request.LoginRequest;
import com.vektra.dto.response.SignupResponse;
import com.vektra.service.AuthService;
import com.vektra.service.FaceAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final FaceAuthService faceAuthService;
    private final FaceLoginRateLimiter faceLoginRateLimiter;

    @PostMapping("/login")
    public SignupResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * 1:N face login. Body carries the 128-d embedding the browser computed
     * with face-api.js; we scan every enrolled user and accept the closest
     * match if it's strictly within {@code vektra.face.match-threshold}.
     * Response shape mirrors {@code /login} so the frontend can drop it into
     * the same session-storage path regardless of how the user authenticated.
     */
    @PostMapping("/face-login")
    public SignupResponse faceLogin(
            @Valid @RequestBody FaceLoginRequest request,
            HttpServletRequest http) {
        faceLoginRateLimiter.acquireOrThrow(http);
        return faceAuthService.loginByFace(request.getEmbedding());
    }

    /**
     * Rotates a user's password. Requires the current password as a
     * re-authentication step. 204 No Content on success; 401 on wrong
     * current password; 400 if the new one equals the current one.
     */
    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
    }
}
