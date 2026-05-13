package com.mom.task.controller.dto;

import com.mom.task.domain.TaskStatus;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record UpdateTaskRequest(
        @Size(max = 200) String title,
        @Size(max = 600) String description,
        Long categoryId,
        @Positive(message = "assigneeUserId must be greater than 0") Long assigneeUserId,
        OffsetDateTime dueAt,
        TaskStatus status
) {
}
