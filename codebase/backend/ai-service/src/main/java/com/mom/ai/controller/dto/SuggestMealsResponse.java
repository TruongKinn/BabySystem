package com.mom.ai.controller.dto;

import java.util.List;

public record SuggestMealsResponse(
        List<SuggestedDish> dishes
) {
    public record SuggestedDish(
            String name,
            String description,
            List<String> ingredients,
            String mealType
    ) {
    }
}
