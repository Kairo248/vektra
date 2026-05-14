package com.vektra.dto.response;

import com.vektra.enums.EarnType;
import com.vektra.enums.TaskStatus;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {

    private Long id;
    private String name;
    private String description;
    private Integer rewardAmount;
    private EarnType earnType;
    private TaskStatus status;
    private Instant createdAt;
}
