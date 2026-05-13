package com.mom.meal.controller.dto;

import com.mom.meal.domain.MealType;

public record MealResponse(
        Long id,
        Long familyId,
        String name,
        MealType mealType,
        String description
) {
}
