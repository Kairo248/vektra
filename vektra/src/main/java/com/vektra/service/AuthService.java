package com.vektra.service;

import com.vektra.dto.request.ChangePasswordRequest;
import com.vektra.dto.request.LoginRequest;
import com.vektra.dto.response.SignupResponse;
import com.vektra.entity.Account;
import com.vektra.entity.User;
import com.vektra.entity.Wallet;
import com.vektra.exception.InvalidCredentialsException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.AccountMapper;
import com.vektra.mapper.UserMapper;
import com.vektra.mapper.WalletMapper;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.UserRepository;
import com.vektra.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final AccountMapper accountMapper;
    private final WalletMapper walletMapper;

    /**
     * Validates email/password and returns the same aggregate as signup (user + account + wallet DTOs).
     */
    @Transactional(readOnly = true)
    public SignupResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        Account account = accountRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.getPassword(), account.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        User user = userRepository
                .findById(account.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + account.getUserId()));
        Wallet wallet = walletRepository
                .findByUserId(account.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + account.getUserId()));

        return new SignupResponse(
                userMapper.toResponse(user),
                accountMapper.toResponse(account),
                walletMapper.toResponse(wallet));
    }

    /**
     * Rotates the password for a user after re-verifying the current one.
     *
     * <p>Re-verifying the current password matters even when the request is
     * already "authenticated": it protects against an attacker who has
     * hijacked a single session (cookie/JWT) but doesn't know the actual
     * credential. New password must differ from the current one to avoid
     * confusing no-ops.
     *
     * <p>When real JWTs are introduced this is also the natural place to
     * bump a per-account {@code tokenVersion} so previously issued tokens
     * are rejected on subsequent requests — i.e. an implicit "log out from
     * all devices" on password change.
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        Account account = accountRepository.findByUserId(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Account not found for user: " + request.getUserId()));

        if (!passwordEncoder.matches(request.getCurrentPassword(), account.getPassword())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), account.getPassword())) {
            throw new IllegalArgumentException(
                    "New password must be different from the current one");
        }

        account.setPassword(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);
    }
}
