package com.vektra.mapper;

import com.vektra.dto.response.AccountResponse;
import com.vektra.entity.Account;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    public AccountResponse toResponse(Account entity) {
        if (entity == null) {
            return null;
        }
        return AccountResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .email(entity.getEmail())
                .accountState(entity.getAccountState())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
