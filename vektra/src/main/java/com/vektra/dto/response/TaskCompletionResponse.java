package com.vektra.dto.response;

import com.vektra.enums.TaskCompletionStatus;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskCompletionResponse {

    private Long id;
    private Long userId;
    private Long taskId;
    private String taskName;
    private String taskDescription;
    private Integer rewardAmount;
    private TaskCompletionStatus status;
    private Instant completedAt;
    private Instant updatedAt;
}
