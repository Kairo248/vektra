package com.vektra.controller;

import com.vektra.dto.response.TaskCompletionResponse;
import com.vektra.service.TaskCompletionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class TaskCompletionController {

    private final TaskCompletionService taskCompletionService;

    @PostMapping("/users/{userId}/tasks/{taskId}/completions")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskCompletionResponse complete(@PathVariable Long userId, @PathVariable Long taskId) {
        return taskCompletionService.complete(userId, taskId);
    }

    @GetMapping("/task-completions/{id}")
    public TaskCompletionResponse getById(@PathVariable Long id) {
        return taskCompletionService.getById(id);
    }

    /** Admin approval for MANUAL tasks. */
    @PatchMapping("/task-completions/{id}/approve")
    public TaskCompletionResponse approve(@PathVariable Long id) {
        return taskCompletionService.approve(id);
    }

    @PatchMapping("/task-completions/{id}/reject")
    public TaskCompletionResponse reject(@PathVariable Long id) {
        return taskCompletionService.reject(id);
    }
}
