package com.vektra.service;

import com.vektra.dto.request.CreatePurchaseRequest;
import com.vektra.dto.response.PurchaseResponse;
import com.vektra.entity.Account;
import com.vektra.entity.Purchase;
import com.vektra.entity.StoreItem;
import com.vektra.entity.Transaction;
import com.vektra.entity.Wallet;
import com.vektra.enums.AccountState;
import com.vektra.enums.PurchaseStatus;
import com.vektra.enums.StoreItemStatus;
import com.vektra.enums.TransactionStatus;
import com.vektra.enums.TransactionType;
import com.vektra.enums.WalletState;
import com.vektra.exception.AccountNotActiveException;
import com.vektra.exception.InsufficientBalanceException;
import com.vektra.exception.ItemOutOfStockException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.exception.StoreItemNotAvailableException;
import com.vektra.mapper.PurchaseMapper;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.PurchaseRepository;
import com.vektra.repository.StoreItemRepository;
import com.vektra.repository.TransactionRepository;
import com.vektra.repository.WalletRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final UserService userService;
    private final StoreItemRepository storeItemRepository;
    private final PurchaseRepository purchaseRepository;
    private final WalletRepository walletRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final PurchaseMapper purchaseMapper;
    private final MemberJourneyService memberJourneyService;

    @Transactional
    public PurchaseResponse purchase(Long userId, CreatePurchaseRequest request) {
        Long storeItemId = request.getStoreItemId();
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (storeItemId == null) {
            throw new IllegalArgumentException("storeItemId is required");
        }

        Wallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found for user: " + userId));
        if (wallet.getWalletState() != WalletState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Buyer wallet must be ACTIVE; current state: " + wallet.getWalletState());
        }

        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found for user: " + userId));
        if (account.getAccountState() != AccountState.ACTIVE) {
            throw new AccountNotActiveException(
                    "Buyer account must be ACTIVE; current state: " + account.getAccountState());
        }

        StoreItem item = storeItemRepository.findByIdForUpdate(storeItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Store item not found: " + storeItemId));
        if (item.getStatus() != StoreItemStatus.ACTIVE) {
            throw new StoreItemNotAvailableException("Store item is not available for purchase: " + storeItemId);
        }
        if (item.getStock() != null && item.getStock() <= 0) {
            throw new ItemOutOfStockException("Store item is out of stock: " + storeItemId);
        }

        int price = item.getPriceAmount();
        Long currentBalance = transactionRepository.sumSignedAmountByUserIdAndStatus(
                userId, TransactionStatus.COMPLETED);
        if (currentBalance == null) {
            currentBalance = 0L;
        }
        if (currentBalance < price) {
            throw new InsufficientBalanceException(
                    "Insufficient balance. Available: " + currentBalance + ", required: " + price);
        }

        Purchase purchase = purchaseRepository.save(Purchase.builder()
                .userId(userId)
                .storeItemId(storeItemId)
                .amountPaid(price)
                .status(PurchaseStatus.COMPLETED)
                .build());

        Transaction spend = transactionService.recordPurchase(
                userId, storeItemId, price, purchase.getId());

        if (item.getStock() != null) {
            item.setStock(item.getStock() - 1);
            storeItemRepository.save(item);
        }

        memberJourneyService.recordPurchase(purchase, item, spend.getId());

        long balanceAfter = currentBalance - price;
        return purchaseMapper.toResponse(purchase, item, spend.getId(), balanceAfter);
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponse> listForUser(Long userId) {
        userService.getById(userId);
        return purchaseRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(purchase -> {
                    StoreItem item = storeItemRepository.findById(purchase.getStoreItemId()).orElse(null);
                    return purchaseMapper.toResponse(purchase, item, null, null);
                })
                .toList();
    }
}
