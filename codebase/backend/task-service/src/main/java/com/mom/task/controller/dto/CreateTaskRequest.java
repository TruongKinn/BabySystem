package com.mom.task.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record CreateTaskRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 600) String description,
        Long categoryId,
        @Positive(message = "assigneeUserId must be greater than 0") Long assigneeUserId,
        @Positive(message = "createdByUserId must be greater than 0") Long createdByUserId,
        OffsetDateTime dueAt
) {
}
