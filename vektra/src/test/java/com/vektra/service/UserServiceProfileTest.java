package com.vektra.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vektra.dto.request.UpdateUserRequest;
import com.vektra.dto.response.UserResponse;
import com.vektra.entity.User;
import com.vektra.enums.UserType;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.UserMapper;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.UserRepository;
import com.vektra.repository.WalletRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Fast unit tests for {@link UserService#updateProfile(Long, UpdateUserRequest)}.
 * No Spring context, no DB — Mockito mocks the repository and the mapper so
 * the suite runs in milliseconds and is safe to run on every commit.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceProfileTest {

    @Mock UserRepository userRepository;
    @Mock AccountRepository accountRepository;
    @Mock WalletRepository walletRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserMapper userMapper;
    @Mock com.vektra.mapper.AccountMapper accountMapper;
    @Mock com.vektra.mapper.WalletMapper walletMapper;

    @InjectMocks UserService userService;

    private User existing;

    @BeforeEach
    void setUp() {
        existing = User.builder()
                .id(42L)
                .name("Ada")
                .surname("Lovelace")
                .userType(UserType.USER)
                .createdAt(Instant.parse("2024-01-01T00:00:00Z"))
                .build();
    }

    @Test
    void updatesNameAndSurnameWhenBothProvided() {
        when(userRepository.findById(42L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return UserResponse.builder()
                    .id(u.getId())
                    .name(u.getName())
                    .surname(u.getSurname())
                    .userType(u.getUserType())
                    .createdAt(u.getCreatedAt())
                    .build();
        });

        UserResponse result = userService.updateProfile(
                42L,
                UpdateUserRequest.builder().name("Grace").surname("Hopper").build());

        assertThat(result.getName()).isEqualTo("Grace");
        assertThat(result.getSurname()).isEqualTo("Hopper");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void trimsValuesBeforePersisting() {
        when(userRepository.findById(42L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return UserResponse.builder().name(u.getName()).surname(u.getSurname()).build();
        });

        UserResponse result = userService.updateProfile(
                42L,
                UpdateUserRequest.builder().name("  Grace  ").surname(" Hopper ").build());

        assertThat(result.getName()).isEqualTo("Grace");
        assertThat(result.getSurname()).isEqualTo("Hopper");
    }

    @Test
    void leavesUnchangedFieldsAloneWhenNullInPatch() {
        when(userRepository.findById(42L)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return UserResponse.builder().name(u.getName()).surname(u.getSurname()).build();
        });

        UserResponse result = userService.updateProfile(
                42L,
                UpdateUserRequest.builder().surname("Hopper").build());

        assertThat(result.getName()).isEqualTo("Ada");
        assertThat(result.getSurname()).isEqualTo("Hopper");
    }

    @Test
    void doesNotPersistWhenAllFieldsAreNull() {
        when(userRepository.findById(42L)).thenReturn(Optional.of(existing));
        when(userMapper.toResponse(existing)).thenReturn(
                UserResponse.builder().name("Ada").surname("Lovelace").build());

        userService.updateProfile(42L, UpdateUserRequest.builder().build());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rejectsBlankName() {
        when(userRepository.findById(42L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> userService.updateProfile(
                        42L, UpdateUserRequest.builder().name("   ").build()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void rejectsBlankSurname() {
        when(userRepository.findById(42L)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> userService.updateProfile(
                        42L, UpdateUserRequest.builder().surname("").build()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("surname");
    }

    @Test
    void throwsResourceNotFoundWhenUserMissing() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateProfile(
                        999L, UpdateUserRequest.builder().name("Grace").build()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }
}
