package com.vektra.service;

import com.vektra.dto.response.TaskCompletionResponse;
import com.vektra.entity.Task;
import com.vektra.entity.TaskCompletion;
import com.vektra.enums.EarnType;
import com.vektra.enums.TaskCompletionStatus;
import com.vektra.enums.TaskStatus;
import com.vektra.exception.DuplicateTaskCompletionException;
import com.vektra.exception.InvalidTaskCompletionStateException;
import com.vektra.exception.InvalidTaskStateException;
import com.vektra.exception.ResourceNotFoundException;
import com.vektra.mapper.TaskCompletionMapper;
import com.vektra.repository.TaskCompletionRepository;
import com.vektra.repository.TaskRepository;
import com.vektra.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskCompletionService {

    private final TaskCompletionRepository taskCompletionRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final AccountService accountService;
    private final TransactionService transactionService;
    private final TaskCompletionMapper taskCompletionMapper;

    @Transactional
    public TaskCompletionResponse complete(Long userId, Long taskId) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        accountService.requireActiveAccount(userId);

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
        if (task.getStatus() != TaskStatus.ACTIVE) {
            throw new InvalidTaskStateException("Task is not available; status: " + task.getStatus());
        }

        TaskCompletionStatus newStatus =
                task.getEarnType() == EarnType.AUTOMATIC ? TaskCompletionStatus.APPROVED : TaskCompletionStatus.PENDING;
        Instant now = Instant.now();

        TaskCompletion saved;
        Optional<TaskCompletion> existing = taskCompletionRepository.findByUserIdAndTaskId(userId, taskId);
        if (existing.isPresent()) {
            TaskCompletion tc = existing.get();
            if (tc.getStatus() == TaskCompletionStatus.PENDING || tc.getStatus() == TaskCompletionStatus.APPROVED) {
                throw new DuplicateTaskCompletionException(
                        "This user already has a pending or approved completion for this task.");
            }
            tc.setStatus(newStatus);
            tc.setCompletedAt(now);
            saved = taskCompletionRepository.save(tc);
        } else {
            TaskCompletion created = TaskCompletion.builder()
                    .userId(userId)
                    .taskId(taskId)
                    .status(newStatus)
                    .build();
            saved = taskCompletionRepository.save(created);
        }

        grantLedgerRewardIfApproved(task, saved);
        return taskCompletionMapper.toResponse(saved, task);
    }

    @Transactional
    public TaskCompletionResponse approve(Long completionId) {
        TaskCompletion tc = taskCompletionRepository.findById(completionId)
                .orElseThrow(() -> new ResourceNotFoundException("Task completion not found: " + completionId));
        if (tc.getStatus() != TaskCompletionStatus.PENDING) {
            throw new InvalidTaskCompletionStateException(
                    "Only PENDING completions can be approved; current: " + tc.getStatus());
        }
        tc.setStatus(TaskCompletionStatus.APPROVED);
        TaskCompletion saved = taskCompletionRepository.save(tc);
        Task task = taskRepository.findById(saved.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + saved.getTaskId()));
        grantLedgerRewardIfApproved(task, saved);
        return taskCompletionMapper.toResponse(saved, task);
    }

    @Transactional
    public TaskCompletionResponse reject(Long completionId) {
        TaskCompletion tc = taskCompletionRepository.findById(completionId)
                .orElseThrow(() -> new ResourceNotFoundException("Task completion not found: " + completionId));
        if (tc.getStatus() != TaskCompletionStatus.PENDING) {
            throw new InvalidTaskCompletionStateException(
                    "Only PENDING completions can be rejected; current: " + tc.getStatus());
        }
        tc.setStatus(TaskCompletionStatus.REJECTED);
        TaskCompletion saved = taskCompletionRepository.save(tc);
        Task task = taskRepository.findById(saved.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + saved.getTaskId()));
        return taskCompletionMapper.toResponse(saved, task);
    }

    @Transactional(readOnly = true)
    public TaskCompletionResponse getById(Long id) {
        TaskCompletion tc = taskCompletionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task completion not found: " + id));
        Task task = taskRepository.findById(tc.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + tc.getTaskId()));
        return taskCompletionMapper.toResponse(tc, task);
    }

    @Transactional(readOnly = true)
    public List<TaskCompletionResponse> listByStatus(TaskCompletionStatus status) {
        List<TaskCompletion> completions = taskCompletionRepository.findAllByStatusOrderByCompletedAtDesc(status);
        if (completions.isEmpty()) {
            return List.of();
        }
        List<Long> taskIds = completions.stream().map(TaskCompletion::getTaskId).distinct().toList();
        Map<Long, Task> taskById = taskRepository.findAllById(taskIds).stream()
                .collect(Collectors.toMap(Task::getId, t -> t));
        return completions.stream()
                .map(tc -> {
                    Task task = taskById.get(tc.getTaskId());
                    if (task == null) {
                        throw new ResourceNotFoundException("Task not found: " + tc.getTaskId());
                    }
                    return taskCompletionMapper.toResponse(tc, task);
                })
                .toList();
    }

    private void grantLedgerRewardIfApproved(Task task, TaskCompletion completion) {
        if (completion.getStatus() != TaskCompletionStatus.APPROVED) {
            return;
        }
        transactionService.recordTaskReward(
                completion.getUserId(), task.getId(), task.getRewardAmount(), completion.getId());
    }
}
