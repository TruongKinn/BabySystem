package com.mom.meal.controller.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateMealPlanRequest(
        @NotNull Long familyId,
        @NotNull Long mealId,
        @NotNull LocalDate planDate,
        @Size(max = 500) String notes
) {
}
