package com.vektra.mapper;

import com.vektra.dto.response.TaskResponse;
import com.vektra.entity.Task;
import org.springframework.stereotype.Component;

@Component
public class TaskMapper {

    public TaskResponse toResponse(Task entity) {
        if (entity == null) {
            return null;
        }
        return TaskResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .rewardAmount(entity.getRewardAmount())
                .earnType(entity.getEarnType())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
