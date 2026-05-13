package com.mom.meal.controller.dto;

import com.mom.meal.domain.MealType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateMealRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 160) String name,
        @NotNull MealType mealType,
        @Size(max = 500) String description
) {
}
