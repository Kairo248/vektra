package com.vektra.mapper;

import com.vektra.dto.response.WalletResponse;
import com.vektra.entity.Wallet;
import org.springframework.stereotype.Component;

@Component
public class WalletMapper {

    public WalletResponse toResponse(Wallet entity) {
        if (entity == null) {
            return null;
        }
        return WalletResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .walletState(entity.getWalletState())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
