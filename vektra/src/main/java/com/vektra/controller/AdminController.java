package com.vektra.controller;

import com.vektra.dto.response.AdminUserListItem;
import com.vektra.dto.response.TaskCompletionResponse;
import com.vektra.dto.response.TaskResponse;
import com.vektra.enums.TaskCompletionStatus;
import com.vektra.repository.UserRepository;
import com.vektra.service.TaskCompletionService;
import com.vektra.service.TaskService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final TaskService taskService;
    private final TaskCompletionService taskCompletionService;

    @GetMapping("/users")
    public List<AdminUserListItem> listUsers() {
        return userRepository.findAllUsersWithAccounts();
    }

    @GetMapping("/tasks")
    public List<TaskResponse> listAllTasks() {
        return taskService.listAllForAdmin();
    }

    @GetMapping("/task-completions")
    public List<TaskCompletionResponse> listCompletions(
            @RequestParam(defaultValue = "PENDING") TaskCompletionStatus status) {
        return taskCompletionService.listByStatus(status);
    }

    /** All successfully completed task submissions (APPROVED), newest first. */
    @GetMapping("/completed-tasks")
    public List<TaskCompletionResponse> listAllCompletedTasks() {
        return taskCompletionService.listByStatus(TaskCompletionStatus.APPROVED);
    }
}
