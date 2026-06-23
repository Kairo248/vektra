package com.vektra.mapper;

import com.vektra.dto.response.PurchaseResponse;
import com.vektra.entity.Purchase;
import com.vektra.entity.StoreItem;
import org.springframework.stereotype.Component;

@Component
public class PurchaseMapper {

    public PurchaseResponse toResponse(
            Purchase purchase, StoreItem item, Long transactionId, Long balanceAfter) {
        if (purchase == null) {
            return null;
        }
        return PurchaseResponse.builder()
                .id(purchase.getId())
                .userId(purchase.getUserId())
                .storeItemId(purchase.getStoreItemId())
                .storeItemName(item != null ? item.getName() : null)
                .amountPaid(purchase.getAmountPaid())
                .status(purchase.getStatus())
                .transactionId(transactionId)
                .balanceAfter(balanceAfter)
                .createdAt(purchase.getCreatedAt())
                .build();
    }
}
