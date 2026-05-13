package com.mom.expense.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateExpenseCategoryRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 100) String name,
        @Pattern(regexp = "^#?[A-Fa-f0-9]{6}$", message = "must be a hex color, example #F59E0B")
        String colorCode,
        Boolean defaultCategory
) {
}
