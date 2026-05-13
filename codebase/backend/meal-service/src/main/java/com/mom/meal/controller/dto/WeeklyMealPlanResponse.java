package com.mom.meal.controller.dto;

import java.time.LocalDate;
import java.util.List;

public record WeeklyMealPlanResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        List<MealPlanResponse> plans
) {
}
