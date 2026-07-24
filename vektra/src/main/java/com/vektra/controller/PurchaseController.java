package com.vektra.controller;

import com.vektra.dto.request.CreatePurchaseRequest;
import com.vektra.dto.response.PurchaseResponse;
import com.vektra.service.PurchaseService;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/v1/users/{userId}/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseResponse purchase(
            @PathVariable Long userId, @Valid @RequestBody CreatePurchaseRequest request) {
        return purchaseService.purchase(userId, request);
    }

    @GetMapping
    public List<PurchaseResponse> listForUser(@PathVariable Long userId) {
        return purchaseService.listForUser(userId);
    }
}
