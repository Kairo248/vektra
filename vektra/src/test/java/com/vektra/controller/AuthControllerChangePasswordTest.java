package com.vektra.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vektra.dto.request.ChangePasswordRequest;
import com.vektra.exception.InvalidCredentialsException;
import com.vektra.service.AuthService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerChangePasswordTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AuthService authService;

    @Test
    void returns204OnSuccess() throws Exception {
        doNothing().when(authService).changePassword(any(ChangePasswordRequest.class));

        mvc.perform(post("/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", 42,
                                "currentPassword", "oldpass",
                                "newPassword", "newpass123"))))
                .andExpect(status().isNoContent());

        verify(authService, times(1)).changePassword(any(ChangePasswordRequest.class));
    }

    @Test
    void returns401WhenCurrentPasswordWrong() throws Exception {
        doThrow(new InvalidCredentialsException("Current password is incorrect"))
                .when(authService).changePassword(any(ChangePasswordRequest.class));

        mvc.perform(post("/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", 42,
                                "currentPassword", "wrong",
                                "newPassword", "newpass123"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));
    }

    @Test
    void rejectsTooShortNewPassword() throws Exception {
        mvc.perform(post("/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "userId", 42,
                                "currentPassword", "oldpass",
                                "newPassword", "short"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.newPassword").exists());

        verify(authService, never()).changePassword(any());
    }

    @Test
    void rejectsMissingUserId() throws Exception {
        mvc.perform(post("/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "oldpass",
                                "newPassword", "newpass123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.userId").exists());
    }
}
