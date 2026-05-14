package com.vektra.service;

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
}
