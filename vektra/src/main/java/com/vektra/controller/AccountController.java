package com.vektra.controller;

import com.vektra.dto.response.AccountResponse;
import com.vektra.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/{id}")
    public AccountResponse getAccount(@PathVariable Long id) {
        return accountService.getById(id);
    }

    /** Admin verification: moves account from PENDING to ACTIVE. */
    @PatchMapping("/{id}/activate")
    public AccountResponse activate(@PathVariable Long id) {
        return accountService.activate(id);
    }

    @PatchMapping("/{id}/suspend")
    public AccountResponse suspend(@PathVariable Long id) {
        return accountService.suspend(id);
    }
}
