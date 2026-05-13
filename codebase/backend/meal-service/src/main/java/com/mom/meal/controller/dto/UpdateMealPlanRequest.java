package com.mom.meal.controller.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateMealPlanRequest(
        Long mealId,
        LocalDate planDate,
        @Size(max = 500) String notes
) {
}
