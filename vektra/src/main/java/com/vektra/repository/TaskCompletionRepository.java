package com.vektra.repository;

import com.vektra.entity.TaskCompletion;
import com.vektra.enums.TaskCompletionStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskCompletionRepository extends JpaRepository<TaskCompletion, Long> {

    Optional<TaskCompletion> findByUserIdAndTaskId(Long userId, Long taskId);

    List<TaskCompletion> findAllByStatusOrderByCompletedAtDesc(TaskCompletionStatus status);
}
