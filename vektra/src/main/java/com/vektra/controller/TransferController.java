package com.vektra.controller;

import com.vektra.dto.request.TransferRequest;
import com.vektra.dto.response.TransferResponse;
import com.vektra.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Peer-to-peer Vektra transfers.
 *
 * The path's {@code {userId}} is the SENDER. The body identifies the recipient
 * (by id, with optional email/name confirmation fields). All business rules
 * — funds check, account/wallet state, recipient verification, atomic
 * double-entry insert — live in {@link TransferService}; this controller only
 * does HTTP mapping.
 */
@RestController
@RequestMapping("/v1/users/{userId}/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransferResponse send(
            @PathVariable("userId") Long senderId,
            @Valid @RequestBody TransferRequest request) {
        return transferService.transfer(senderId, request);
    }
}
