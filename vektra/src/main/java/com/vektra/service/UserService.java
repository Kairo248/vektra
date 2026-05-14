package com.vektra.service;

import com.vektra.dto.request.SignupRequest;
import com.vektra.dto.response.SignupResponse;
import com.vektra.dto.response.UserResponse;
import com.vektra.entity.Account;
import com.vektra.entity.User;
import com.vektra.entity.Wallet;
import com.vektra.enums.AccountState;
import com.vektra.enums.UserType;
import com.vektra.enums.WalletState;
import com.vektra.exception.DuplicateEmailException;
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
public class UserService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final AccountMapper accountMapper;
    private final WalletMapper walletMapper;

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        return userMapper.toResponse(user);
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (accountRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("Email already registered: " + email);
        }

        User user = User.builder()
                .name(request.getName().trim())
                .surname(request.getSurname().trim())
                .userType(UserType.USER)
                .build();
        user = userRepository.save(user);

        Account account = Account.builder()
                .userId(user.getId())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .accountState(AccountState.PENDING)
                .build();
        account = accountRepository.save(account);

        Wallet wallet = Wallet.builder()
                .userId(user.getId())
                .walletState(WalletState.ACTIVE)
                .build();
        wallet = walletRepository.save(wallet);

        return new SignupResponse(
                userMapper.toResponse(user),
                accountMapper.toResponse(account),
                walletMapper.toResponse(wallet));
    }
}
