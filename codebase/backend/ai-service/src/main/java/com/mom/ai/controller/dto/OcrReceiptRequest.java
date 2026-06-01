package com.mom.ai.controller.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OcrReceiptRequest(
        @NotNull
        @Positive
        Long familyId,

        @NotNull
        @Positive
        Long fileId,

        String language
) {
}
