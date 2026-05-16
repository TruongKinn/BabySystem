package com.mom.baby.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BabyCareTrendPointResponse(
        LocalDate date,
        BigDecimal sleepHours,
        long feedings,
        long diaperChanges,
        long totalLogs
) {
}
