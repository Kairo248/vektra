package com.vektra.service;

import com.vektra.dto.response.AccountResponse;
import com.vektra.entity.Account;
import com.vektra.enums.AccountState;
import com.vektra.exception.AccountNotActiveException;
import com.vektra.exception.InvalidAccountStateException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.AccountMapper;
import com.vektra.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountMapper accountMapper;
    private final MemberJourneyService memberJourneyService;

    @Transactional(readOnly = true)
    public void requireActiveAccount(Long userId) {
        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for user: " + userId));
        if (account.getAccountState() != AccountState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Account must be ACTIVE to perform this action; current state: " + account.getAccountState());
        }
    }

    @Transactional(readOnly = true)
    public AccountResponse getByUserId(Long userId) {
        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for user: " + userId));
        return accountMapper.toResponse(account);
    }

    @Transactional(readOnly = true)
    public AccountResponse getById(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountId));
        return accountMapper.toResponse(account);
    }

    @Transactional
    public AccountResponse activate(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountId));
        if (account.getAccountState() != AccountState.PENDING) {
            throw new InvalidAccountStateException(
                    "Only PENDING accounts can be activated; current state: " + account.getAccountState());
        }
        account.setAccountState(AccountState.ACTIVE);
        Account saved = accountRepository.save(account);
        memberJourneyService.recordAccountActivated(saved);
        return accountMapper.toResponse(saved);
    }

    @Transactional
    public AccountResponse suspend(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountId));
        if (account.getAccountState() == AccountState.SUSPENDED) {
            return accountMapper.toResponse(account);
        }
        account.setAccountState(AccountState.SUSPENDED);
        return accountMapper.toResponse(accountRepository.save(account));
    }
}
