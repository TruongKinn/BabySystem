package com.mom.task.controller.dto;

import java.time.OffsetDateTime;

public record RecurringTaskResponse(
        Long id,
        Long familyId,
        String title,
        String description,
        Long categoryId,
        String categoryName,
        Long assigneeUserId,
        String recurrenceRule,
        OffsetDateTime nextRunAt,
        boolean active
) {
}
