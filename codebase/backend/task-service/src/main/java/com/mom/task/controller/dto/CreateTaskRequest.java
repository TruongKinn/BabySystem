package com.mom.task.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record CreateTaskRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 600) String description,
        Long categoryId,
        Long assigneeUserId,
        OffsetDateTime dueAt
) {
}
