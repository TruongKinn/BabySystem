package com.mom.task.event;

import com.mom.task.domain.TaskStatus;

import java.time.OffsetDateTime;

public record TaskChangedPayload(
        Long taskId,
        Long familyId,
        String title,
        TaskStatus status,
        Long assigneeUserId,
        OffsetDateTime dueAt,
        OffsetDateTime completedAt
) {
}
