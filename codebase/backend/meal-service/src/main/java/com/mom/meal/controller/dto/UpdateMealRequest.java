package com.mom.meal.controller.dto;

import com.mom.meal.domain.MealType;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateMealRequest(
        @Pattern(regexp = ".*\\S.*", message = "name must not be blank")
        @Size(max = 160)
        String name,
        MealType mealType,
        @Size(max = 500)
        String description,
        @Size(max = 500)
        String ingredients
) {
}
