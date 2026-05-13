package com.mom.task.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.task.controller.dto.CreateRecurringTaskRequest;
import com.mom.task.controller.dto.CreateTaskCategoryRequest;
import com.mom.task.controller.dto.CreateTaskRequest;
import com.mom.task.controller.dto.RecurringTaskResponse;
import com.mom.task.controller.dto.TaskCategoryResponse;
import com.mom.task.controller.dto.TaskPendingCountResponse;
import com.mom.task.controller.dto.TaskResponse;
import com.mom.task.controller.dto.UpdateTaskRequest;
import com.mom.task.domain.TaskStatus;
import com.mom.task.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping("/task-categories")
    public ApiResponse<TaskCategoryResponse> createTaskCategory(@Valid @RequestBody CreateTaskCategoryRequest request) {
        return ApiResponse.ok("Task category created", taskService.createCategory(request));
    }

    @GetMapping("/task-categories")
    public ApiResponse<List<TaskCategoryResponse>> getTaskCategories(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", taskService.getCategories(familyId));
    }

    @PostMapping("/tasks")
    public ApiResponse<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        return ApiResponse.ok("Task created", taskService.createTask(request));
    }

    @GetMapping("/tasks")
    public ApiResponse<List<TaskResponse>> getTasks(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "status", required = false) TaskStatus status,
            @RequestParam(value = "assigneeUserId", required = false) Long assigneeUserId
    ) {
        return ApiResponse.ok("Success", taskService.getTasks(familyId, status, assigneeUserId));
    }

    @GetMapping("/tasks/{id}")
    public ApiResponse<TaskResponse> getTask(@PathVariable("id") Long taskId) {
        return ApiResponse.ok("Success", taskService.getTask(taskId));
    }

    @PutMapping("/tasks/{id}")
    public ApiResponse<TaskResponse> updateTask(
            @PathVariable("id") Long taskId,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        return ApiResponse.ok("Task updated", taskService.updateTask(taskId, request));
    }

    @PostMapping("/tasks/{id}/complete")
    public ApiResponse<TaskResponse> completeTask(@PathVariable("id") Long taskId) {
        return ApiResponse.ok("Task completed", taskService.completeTask(taskId));
    }

    @DeleteMapping("/tasks/{id}")
    public ApiResponse<Object> deleteTask(@PathVariable("id") Long taskId) {
        taskService.deleteTask(taskId);
        return ApiResponse.ok("Task deleted", null);
    }

    @GetMapping("/tasks/pending/count")
    public ApiResponse<TaskPendingCountResponse> getPendingCount(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", taskService.getPendingCount(familyId));
    }

    @PostMapping("/recurring-tasks")
    public ApiResponse<RecurringTaskResponse> createRecurringTask(@Valid @RequestBody CreateRecurringTaskRequest request) {
        return ApiResponse.ok("Recurring task created", taskService.createRecurringTask(request));
    }

    @GetMapping("/recurring-tasks")
    public ApiResponse<List<RecurringTaskResponse>> getRecurringTasks(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", taskService.getRecurringTasks(familyId));
    }
}
