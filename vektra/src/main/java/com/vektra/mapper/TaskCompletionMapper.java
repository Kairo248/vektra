package com.vektra.mapper;

import com.vektra.dto.response.TaskCompletionResponse;
import com.vektra.entity.Task;
import com.vektra.entity.TaskCompletion;
import org.springframework.stereotype.Component;

@Component
public class TaskCompletionMapper {

    public TaskCompletionResponse toResponse(TaskCompletion entity, Task task) {
        if (entity == null || task == null) {
            return null;
        }
        return toResponse(entity, task.getName(), task.getDescription(), task.getRewardAmount());
    }

    public TaskCompletionResponse toResponse(TaskCompletion entity, String taskName, String taskDescription, Integer rewardAmount) {
        if (entity == null) {
            return null;
        }
        return TaskCompletionResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .taskId(entity.getTaskId())
                .taskName(taskName)
                .taskDescription(taskDescription)
                .rewardAmount(rewardAmount)
                .status(entity.getStatus())
                .completedAt(entity.getCompletedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
