package com.vektra.mapper;

import com.vektra.dto.response.UserResponse;
import com.vektra.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(User entity) {
        if (entity == null) {
            return null;
        }
        return UserResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .surname(entity.getSurname())
                .userType(entity.getUserType())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
