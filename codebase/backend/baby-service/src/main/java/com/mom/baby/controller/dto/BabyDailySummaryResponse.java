package com.mom.baby.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BabyDailySummaryResponse(
        Long babyId,
        LocalDate date,
        BigDecimal sleepHours,
        long feedings,
        long diaperChanges,
        BigDecimal latestWeightKg,
        LocalDate nextVaccination
) {
}
