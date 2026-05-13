package com.mom.baby.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateGrowthRecordRequest(
        @NotNull LocalDate measuredAt,
        @DecimalMin(value = "0.00", inclusive = false) BigDecimal weightKg,
        @DecimalMin(value = "0.00", inclusive = false) BigDecimal heightCm,
        @DecimalMin(value = "0.00", inclusive = false) BigDecimal headCircumferenceCm,
        @Size(max = 500) String notes
) {
}
