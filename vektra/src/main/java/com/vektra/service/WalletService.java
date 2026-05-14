package com.vektra.service;

import com.vektra.dto.response.WalletBalanceResponse;
import com.vektra.dto.response.WalletResponse;
import com.vektra.entity.Wallet;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.WalletMapper;
import com.vektra.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final TransactionService transactionService;
    private final WalletMapper walletMapper;

    @Transactional(readOnly = true)
    public WalletResponse getByUserId(Long userId) {
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));
        return walletMapper.toResponse(wallet);
    }

    @Transactional(readOnly = true)
    public WalletResponse getById(Long walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found: " + walletId));
        return walletMapper.toResponse(wallet);
    }

    @Transactional(readOnly = true)
    public WalletBalanceResponse getLedgerBalance(Long userId) {
        return transactionService.getWalletBalance(userId);
    }
}
