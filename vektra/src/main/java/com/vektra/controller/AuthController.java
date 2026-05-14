package com.vektra.controller;

import com.vektra.dto.request.LoginRequest;
import com.vektra.dto.response.SignupResponse;
import com.vektra.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public SignupResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
