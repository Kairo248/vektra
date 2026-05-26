package com.vektra.controller;

import com.vektra.dto.request.UpdateUserRoleRequest;
import com.vektra.dto.response.AdminUserListItem;
import com.vektra.dto.response.TaskCompletionResponse;
import com.vektra.dto.response.TaskResponse;
import com.vektra.dto.response.UserResponse;
import com.vektra.enums.TaskCompletionStatus;
import com.vektra.repository.UserRepository;
import com.vektra.service.TaskCompletionService;
import com.vektra.service.TaskService;
import com.vektra.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final TaskService taskService;
    private final TaskCompletionService taskCompletionService;

    @GetMapping("/users")
    public List<AdminUserListItem> listUsers() {
        return userRepository.findAllUsersWithAccounts();
    }

    /**
     * Promote/demote a user. Body: {"userType": "ADMIN"} or {"userType": "USER"}.
     * Idempotent: re-applying the current role returns the same UserResponse.
     *
     * NOTE: Spring Security is currently configured with permitAll() in
     * SecurityConfig, so this endpoint is open — anyone who can reach the
     * backend can call it. Adding a UserType.ADMIN check at the security
     * filter / @PreAuthorize layer is the next hardening step; once added
     * it naturally covers every /v1/admin/* route including this one.
     */
    @PatchMapping("/users/{id}/role")
    public UserResponse updateUserRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        return userService.updateRole(id, request);
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
