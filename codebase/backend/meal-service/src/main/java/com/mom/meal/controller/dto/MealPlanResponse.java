package com.mom.meal.controller.dto;

import com.mom.meal.domain.MealType;

import java.io.Serializable;
import java.time.LocalDate;

public record MealPlanResponse(
        Long id,
        Long familyId,
        Long mealId,
        String mealName,
        MealType mealType,
        LocalDate planDate,
        String notes
) implements Serializable {

    private static final long serialVersionUID = 1L;
}
