package com.vektra.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.vektra.dto.request.ChangePasswordRequest;
import com.vektra.entity.Account;
import com.vektra.enums.AccountState;
import com.vektra.exception.InvalidCredentialsException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.AccountMapper;
import com.vektra.mapper.UserMapper;
import com.vektra.mapper.WalletMapper;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.UserRepository;
import com.vektra.repository.WalletRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceChangePasswordTest {

    @Mock AccountRepository accountRepository;
    @Mock UserRepository userRepository;
    @Mock WalletRepository walletRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserMapper userMapper;
    @Mock AccountMapper accountMapper;
    @Mock WalletMapper walletMapper;

    @InjectMocks AuthService authService;

    private Account account;

    @BeforeEach
    void setUp() {
        account = Account.builder()
                .id(1L)
                .userId(42L)
                .email("ada@example.com")
                .password("ENCODED_OLD")
                .accountState(AccountState.ACTIVE)
                .createdAt(Instant.parse("2024-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2024-01-01T00:00:00Z"))
                .build();
    }

    @Test
    void rotatesPasswordWhenCurrentMatchesAndNewIsDifferent() {
        when(accountRepository.findByUserId(42L)).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("oldpass", "ENCODED_OLD")).thenReturn(true);
        when(passwordEncoder.matches("newpass123", "ENCODED_OLD")).thenReturn(false);
        when(passwordEncoder.encode("newpass123")).thenReturn("ENCODED_NEW");
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        authService.changePassword(ChangePasswordRequest.builder()
                .userId(42L)
                .currentPassword("oldpass")
                .newPassword("newpass123")
                .build());

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getPassword()).isEqualTo("ENCODED_NEW");
    }

    @Test
    void rejectsWhenCurrentPasswordIsWrong() {
        when(accountRepository.findByUserId(42L)).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("wrong", "ENCODED_OLD")).thenReturn(false);

        assertThatThrownBy(() -> authService.changePassword(ChangePasswordRequest.builder()
                        .userId(42L)
                        .currentPassword("wrong")
                        .newPassword("newpass123")
                        .build()))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void rejectsWhenNewPasswordEqualsCurrent() {
        when(accountRepository.findByUserId(42L)).thenReturn(Optional.of(account));
        when(passwordEncoder.matches("samepass", "ENCODED_OLD")).thenReturn(true);

        assertThatThrownBy(() -> authService.changePassword(ChangePasswordRequest.builder()
                        .userId(42L)
                        .currentPassword("samepass")
                        .newPassword("samepass")
                        .build()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("different");

        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void throwsResourceNotFoundWhenAccountMissing() {
        when(accountRepository.findByUserId(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.changePassword(ChangePasswordRequest.builder()
                        .userId(999L)
                        .currentPassword("oldpass")
                        .newPassword("newpass123")
                        .build()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
