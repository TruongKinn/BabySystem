package com.mom.task.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateTaskCategoryRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 120) String name,
        @Pattern(regexp = "^#?[A-Fa-f0-9]{6}$", message = "must be a hex color, example #60A5FA")
        String colorCode
) {
}
