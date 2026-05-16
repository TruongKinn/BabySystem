package com.mom.baby.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record BabyDailySummaryResponse(
        Long babyId,
        LocalDate date,
        BigDecimal sleepHours,
        long feedings,
        long diaperChanges,
        BigDecimal latestWeightKg,
        LocalDate nextVaccination,
        long careStreakDays,
        OffsetDateTime lastUpdatedAt
) {
}
