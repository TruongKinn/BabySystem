package com.mom.meal.controller.dto;

import java.io.Serializable;
import java.time.LocalDate;

public record MealPlanResponse(
        Long id,
        Long familyId,
        Long mealId,
        String mealName,
        LocalDate planDate,
        String notes
) implements Serializable {

    private static final long serialVersionUID = 1L;
}
