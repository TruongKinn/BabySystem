package com.mom.baby.controller.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OcrScanRequest(
        @NotNull
        @Positive
        Long fileId
) {
}
