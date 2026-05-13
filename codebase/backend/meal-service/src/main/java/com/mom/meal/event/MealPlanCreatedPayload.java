package com.mom.meal.event;

import java.time.LocalDate;

public record MealPlanCreatedPayload(
        Long mealPlanId,
        Long familyId,
        Long mealId,
        String mealName,
        LocalDate planDate,
        String notes
) {
}
