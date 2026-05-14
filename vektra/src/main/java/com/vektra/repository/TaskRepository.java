package com.vektra.repository;

import com.vektra.entity.Task;
import com.vektra.enums.TaskStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByStatusOrderByCreatedAtDesc(TaskStatus status);

    List<Task> findAllByOrderByCreatedAtDesc();
}
