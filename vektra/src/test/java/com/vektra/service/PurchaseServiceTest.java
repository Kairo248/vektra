package com.vektra.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.vektra.exception.InsufficientBalanceException;
import com.vektra.mapper.PurchaseMapper;
import com.vektra.repository.AccountRepository;
import com.vektra.repository.PurchaseRepository;
import com.vektra.repository.StoreItemRepository;
import com.vektra.repository.TransactionRepository;
import com.vektra.repository.WalletRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {

    @Mock UserService userService;
    @Mock StoreItemRepository storeItemRepository;
    @Mock PurchaseRepository purchaseRepository;
    @Mock WalletRepository walletRepository;
    @Mock AccountRepository accountRepository;
    @Mock TransactionRepository transactionRepository;
    @Mock TransactionService transactionService;
    @Mock PurchaseMapper purchaseMapper;

    @InjectMocks PurchaseService purchaseService;

    private StoreItem item;
    private Wallet wallet;
    private Account account;

    @BeforeEach
    void setUp() {
        item = StoreItem.builder()
                .id(10L)
                .name("Coffee voucher")
                .description("Kitchen")
                .priceAmount(50)
                .status(StoreItemStatus.ACTIVE)
                .stock(5)
                .build();
        wallet = Wallet.builder()
                .id(1L)
                .userId(2L)
                .walletState(WalletState.ACTIVE)
                .createdAt(Instant.parse("2024-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2024-01-01T00:00:00Z"))
                .build();
        account = Account.builder()
                .id(1L)
                .userId(2L)
                .email("buyer@example.com")
                .password("hash")
                .accountState(AccountState.ACTIVE)
                .createdAt(Instant.parse("2024-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2024-01-01T00:00:00Z"))
                .build();
    }

    @Test
    void purchasesItemAndReturnsBalanceAfter() {
        when(walletRepository.findByUserIdForUpdate(2L)).thenReturn(Optional.of(wallet));
        when(accountRepository.findByUserId(2L)).thenReturn(Optional.of(account));
        when(storeItemRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(item));
        when(transactionRepository.sumSignedAmountByUserIdAndStatus(2L, TransactionStatus.COMPLETED))
                .thenReturn(200L);

        Purchase savedPurchase = Purchase.builder()
                .id(99L)
                .userId(2L)
                .storeItemId(10L)
                .amountPaid(50)
                .status(PurchaseStatus.COMPLETED)
                .createdAt(Instant.parse("2024-06-01T12:00:00Z"))
                .build();
        when(purchaseRepository.save(any(Purchase.class))).thenReturn(savedPurchase);

        Transaction spend = Transaction.builder()
                .id(500L)
                .userId(2L)
                .storeItemId(10L)
                .purchaseId(99L)
                .amount(50)
                .type(TransactionType.SPEND)
                .status(TransactionStatus.COMPLETED)
                .createdAt(Instant.parse("2024-06-01T12:00:00Z"))
                .build();
        when(transactionService.recordPurchase(2L, 10L, 50, 99L)).thenReturn(spend);
        when(storeItemRepository.save(item)).thenReturn(item);

        PurchaseResponse expected = PurchaseResponse.builder()
                .id(99L)
                .userId(2L)
                .storeItemId(10L)
                .storeItemName("Coffee voucher")
                .amountPaid(50)
                .status(PurchaseStatus.COMPLETED)
                .transactionId(500L)
                .balanceAfter(150L)
                .createdAt(savedPurchase.getCreatedAt())
                .build();
        when(purchaseMapper.toResponse(savedPurchase, item, 500L, 150L)).thenReturn(expected);

        PurchaseResponse result = purchaseService.purchase(
                2L, CreatePurchaseRequest.builder().storeItemId(10L).build());

        assertThat(result.getBalanceAfter()).isEqualTo(150L);
        assertThat(result.getTransactionId()).isEqualTo(500L);
        assertThat(item.getStock()).isEqualTo(4);
        verify(transactionService).recordPurchase(2L, 10L, 50, 99L);
        verify(storeItemRepository).save(item);
    }

    @Test
    void rejectsPurchaseWhenBalanceTooLow() {
        when(walletRepository.findByUserIdForUpdate(2L)).thenReturn(Optional.of(wallet));
        when(accountRepository.findByUserId(2L)).thenReturn(Optional.of(account));
        when(storeItemRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(item));
        when(transactionRepository.sumSignedAmountByUserIdAndStatus(2L, TransactionStatus.COMPLETED))
                .thenReturn(10L);

        assertThatThrownBy(() -> purchaseService.purchase(
                        2L, CreatePurchaseRequest.builder().storeItemId(10L).build()))
                .isInstanceOf(InsufficientBalanceException.class)
                .hasMessageContaining("Insufficient balance");
    }
}
