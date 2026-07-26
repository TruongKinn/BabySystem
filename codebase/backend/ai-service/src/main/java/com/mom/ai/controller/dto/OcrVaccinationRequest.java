package com.mom.ai.controller.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OcrVaccinationRequest(
        @NotNull
        @Positive
        Long familyId,

        @NotNull
        @Positive
        Long fileId,

        String language
) {
}
