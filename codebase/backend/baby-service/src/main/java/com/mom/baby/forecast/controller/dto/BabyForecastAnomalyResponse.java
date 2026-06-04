package com.mom.baby.forecast.controller.dto;

import com.mom.baby.forecast.domain.BabyForecastRiskLevel;

import java.time.OffsetDateTime;

public record BabyForecastAnomalyResponse(
        Long id,
        Long babyId,
        Long familyId,
        Long sourceLogId,
        String anomalyType,
        BabyForecastRiskLevel severity,
        String message,
        OffsetDateTime detectedAt,
        OffsetDateTime resolvedAt,
        String metadataJson
) {
}
