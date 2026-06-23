package com.vektra.mapper;

import com.vektra.dto.response.StoreItemResponse;
import com.vektra.entity.StoreItem;
import org.springframework.stereotype.Component;

@Component
public class StoreItemMapper {

    public StoreItemResponse toResponse(StoreItem entity) {
        if (entity == null) {
            return null;
        }
        return StoreItemResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .priceAmount(entity.getPriceAmount())
                .status(entity.getStatus())
                .stock(entity.getStock())
                .category(entity.getCategory())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
