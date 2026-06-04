package com.mom.ai.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record GenerateTravelPlanRequest(
        @NotNull
        @Positive
        Long familyId,

        @NotBlank
        String destination,

        @NotNull
        @Min(1)
        Integer durationDays,

        @NotBlank
        String startDate,

        String preferences,

        String language
) {
}
