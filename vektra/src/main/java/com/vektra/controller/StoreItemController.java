package com.vektra.controller;

import com.vektra.dto.request.CreateStoreItemRequest;
import com.vektra.dto.request.UpdateStoreItemRequest;
import com.vektra.dto.request.UpdateStoreItemStatusRequest;
import com.vektra.dto.response.StoreItemResponse;
import com.vektra.service.StoreItemService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/store-items")
@RequiredArgsConstructor
public class StoreItemController {

    private final StoreItemService storeItemService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StoreItemResponse create(@Valid @RequestBody CreateStoreItemRequest request) {
        return storeItemService.create(request);
    }

    @GetMapping
    public List<StoreItemResponse> list(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(required = false) String category) {
        return storeItemService.list(includeInactive, category);
    }

    @GetMapping("/{id}")
    public StoreItemResponse getById(@PathVariable Long id) {
        return storeItemService.getById(id);
    }

    @PatchMapping("/{id}")
    public StoreItemResponse update(@PathVariable Long id, @Valid @RequestBody UpdateStoreItemRequest request) {
        return storeItemService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public StoreItemResponse updateStatus(
            @PathVariable Long id, @Valid @RequestBody UpdateStoreItemStatusRequest request) {
        return storeItemService.updateStatus(id, request);
    }
}
