package com.mom.baby.forecast.controller.dto;

import com.mom.baby.forecast.domain.BabyForecastRiskLevel;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record BabyForecastResponse(
        Long id,
        Long babyId,
        Long familyId,
        LocalDate forecastDate,
        OffsetDateTime generatedAt,
        Integer horizonHours,
        OffsetDateTime sleepWindowStart,
        OffsetDateTime sleepWindowEnd,
        OffsetDateTime feedingWindowStart,
        OffsetDateTime feedingWindowEnd,
        BabyForecastRiskLevel riskLevel,
        String summary,
        String recommendationsJson,
        String signalsJson
) {
}
