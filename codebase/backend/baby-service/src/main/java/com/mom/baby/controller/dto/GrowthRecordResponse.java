package com.mom.baby.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GrowthRecordResponse(
        Long id,
        Long babyId,
        LocalDate measuredAt,
        BigDecimal weightKg,
        BigDecimal heightCm,
        BigDecimal headCircumferenceCm,
        String notes
) {
}
