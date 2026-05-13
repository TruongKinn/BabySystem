package com.mom.task.controller.dto;

import com.mom.task.domain.TaskStatus;

import java.time.OffsetDateTime;

public record TaskResponse(
        Long id,
        Long familyId,
        String title,
        String description,
        Long categoryId,
        String categoryName,
        TaskStatus status,
        Long assigneeUserId,
        OffsetDateTime dueAt,
        OffsetDateTime completedAt
) {
}
