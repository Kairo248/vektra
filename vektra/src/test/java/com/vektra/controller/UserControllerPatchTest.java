package com.vektra.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vektra.dto.request.UpdateUserRequest;
import com.vektra.dto.response.UserResponse;
import com.vektra.enums.UserType;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.service.AccountService;
import com.vektra.service.UserService;
import com.vektra.service.WalletService;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Slice test for {@link UserController}. Spring Security is on the classpath
 * (the prod {@code SecurityConfig} uses {@code permitAll()}), so we disable
 * filters here to assert the controller behaviour directly without standing
 * up the full security chain.
 */
@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
class UserControllerPatchTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean UserService userService;
    @MockBean AccountService accountService;
    @MockBean WalletService walletService;

    @Test
    void patchReturnsUpdatedUser() throws Exception {
        UserResponse updated = UserResponse.builder()
                .id(42L)
                .name("Grace")
                .surname("Hopper")
                .userType(UserType.USER)
                .createdAt(Instant.parse("2024-01-01T00:00:00Z"))
                .build();
        when(userService.updateProfile(eq(42L), any(UpdateUserRequest.class))).thenReturn(updated);

        mvc.perform(patch("/v1/users/42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "Grace", "surname", "Hopper"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.name").value("Grace"))
                .andExpect(jsonPath("$.surname").value("Hopper"));
    }

    @Test
    void patchRejectsTooLongName() throws Exception {
        String tooLong = "x".repeat(121);

        mvc.perform(patch("/v1/users/42")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", tooLong))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists());

        verify(userService, never()).updateProfile(any(), any());
    }

    @Test
    void patchReturns404WhenUserMissing() throws Exception {
        when(userService.updateProfile(eq(999L), any(UpdateUserRequest.class)))
                .thenThrow(new ResourceNotFoundException("User not found: 999"));

        mvc.perform(patch("/v1/users/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Grace"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("999")));
    }
}
