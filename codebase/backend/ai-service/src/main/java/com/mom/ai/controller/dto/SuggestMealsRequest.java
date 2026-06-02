package com.mom.ai.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SuggestMealsRequest(
        @NotNull
        @Positive
        Long familyId,

        @NotBlank
        String ingredients,

        String language
) {
}
