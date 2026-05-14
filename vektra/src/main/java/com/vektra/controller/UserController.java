package com.vektra.controller;

import com.vektra.dto.request.SignupRequest;
import com.vektra.dto.response.AccountResponse;
import com.vektra.dto.response.SignupResponse;
import com.vektra.dto.response.UserResponse;
import com.vektra.dto.response.WalletBalanceResponse;
import com.vektra.dto.response.WalletResponse;
import com.vektra.service.AccountService;
import com.vektra.service.UserService;
import com.vektra.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AccountService accountService;
    private final WalletService walletService;

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public SignupResponse signup(@Valid @RequestBody SignupRequest request) {
        return userService.signup(request);
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        return userService.getById(id);
    }

    @GetMapping("/{id}/account")
    public AccountResponse getAccountForUser(@PathVariable Long id) {
        return accountService.getByUserId(id);
    }

    @GetMapping("/{id}/wallet")
    public WalletResponse getWalletForUser(@PathVariable Long id) {
        return walletService.getByUserId(id);
    }

    @GetMapping("/{id}/wallet/balance")
    public WalletBalanceResponse getWalletBalance(@PathVariable Long id) {
        return walletService.getLedgerBalance(id);
    }
}
