package com.vektra.service;

import com.vektra.dto.request.CreateStoreItemRequest;
import com.vektra.dto.request.UpdateStoreItemRequest;
import com.vektra.dto.request.UpdateStoreItemStatusRequest;
import com.vektra.dto.response.StoreItemResponse;
import com.vektra.entity.StoreItem;
import com.vektra.enums.StoreItemStatus;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.StoreItemMapper;
import com.vektra.repository.StoreItemRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StoreItemService {

    private final StoreItemRepository storeItemRepository;
    private final StoreItemMapper storeItemMapper;

    @Transactional
    public StoreItemResponse create(CreateStoreItemRequest request) {
        StoreItemStatus status = request.getStatus() != null ? request.getStatus() : StoreItemStatus.ACTIVE;
        String category = normalizeCategory(request.getCategory());
        StoreItem item = StoreItem.builder()
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .priceAmount(request.getPriceAmount())
                .status(status)
                .stock(request.getStock())
                .category(category)
                .build();
        return storeItemMapper.toResponse(storeItemRepository.save(item));
    }

    @Transactional(readOnly = true)
    public StoreItemResponse getById(Long id) {
        return storeItemMapper.toResponse(findOrThrow(id));
    }

    /**
     * @param includeInactive when {@code true}, returns every item (Factory). Otherwise ACTIVE only (Shop).
     * @param category optional free-text tag filter (case-insensitive)
     */
    @Transactional(readOnly = true)
    public List<StoreItemResponse> list(boolean includeInactive, String category) {
        String normalizedCategory = normalizeCategory(category);
        List<StoreItem> items;
        if (includeInactive) {
            items = normalizedCategory == null
                    ? storeItemRepository.findAllByOrderByCreatedAtDesc()
                    : storeItemRepository.findAllByCategoryIgnoreCaseOrderByCreatedAtDesc(normalizedCategory);
        } else {
            items = normalizedCategory == null
                    ? storeItemRepository.findAllByStatusOrderByCreatedAtDesc(StoreItemStatus.ACTIVE)
                    : storeItemRepository.findAllByStatusAndCategoryIgnoreCaseOrderByCreatedAtDesc(
                            StoreItemStatus.ACTIVE, normalizedCategory);
        }
        return items.stream().map(storeItemMapper::toResponse).toList();
    }

    @Transactional
    public StoreItemResponse update(Long id, UpdateStoreItemRequest request) {
        StoreItem item = findOrThrow(id);
        if (request.getName() != null) {
            String trimmed = request.getName().trim();
            if (trimmed.isEmpty()) {
                throw new IllegalArgumentException("name must not be blank");
            }
            item.setName(trimmed);
        }
        if (request.getDescription() != null) {
            String trimmed = request.getDescription().trim();
            if (trimmed.isEmpty()) {
                throw new IllegalArgumentException("description must not be blank");
            }
            item.setDescription(trimmed);
        }
        if (request.getPriceAmount() != null) {
            item.setPriceAmount(request.getPriceAmount());
        }
        if (Boolean.TRUE.equals(request.getUnlimitedStock())) {
            item.setStock(null);
        } else if (request.getStock() != null) {
            item.setStock(request.getStock());
        }
        if (request.getCategory() != null) {
            item.setCategory(normalizeCategory(request.getCategory()));
        }
        return storeItemMapper.toResponse(storeItemRepository.save(item));
    }

    @Transactional
    public StoreItemResponse updateStatus(Long id, UpdateStoreItemStatusRequest request) {
        StoreItem item = findOrThrow(id);
        item.setStatus(request.getStatus());
        return storeItemMapper.toResponse(storeItemRepository.save(item));
    }

    StoreItem findOrThrow(Long id) {
        return storeItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Store item not found: " + id));
    }

    private static String normalizeCategory(String category) {
        if (category == null) {
            return null;
        }
        String trimmed = category.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
