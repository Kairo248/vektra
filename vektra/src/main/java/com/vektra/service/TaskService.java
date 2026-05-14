package com.vektra.service;

import com.vektra.dto.request.CreateTaskRequest;
import com.vektra.dto.request.UpdateTaskStatusRequest;
import com.vektra.dto.response.TaskResponse;
import com.vektra.entity.Task;
import com.vektra.enums.TaskStatus;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.TaskMapper;
import com.vektra.repository.TaskRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;

    @Transactional
    public TaskResponse create(CreateTaskRequest request) {
        TaskStatus status = request.getStatus() != null ? request.getStatus() : TaskStatus.ACTIVE;
        Task task = Task.builder()
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .rewardAmount(request.getRewardAmount())
                .earnType(request.getEarnType())
                .status(status)
                .build();
        return taskMapper.toResponse(taskRepository.save(task));
    }

    @Transactional(readOnly = true)
    public TaskResponse getById(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + id));
        return taskMapper.toResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listActive() {
        return taskRepository.findAllByStatusOrderByCreatedAtDesc(TaskStatus.ACTIVE).stream()
                .map(taskMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listAllForAdmin() {
        return taskRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(taskMapper::toResponse)
                .toList();
    }

    @Transactional
    public TaskResponse updateStatus(Long taskId, UpdateTaskStatusRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
        task.setStatus(request.getStatus());
        return taskMapper.toResponse(taskRepository.save(task));
    }
}
