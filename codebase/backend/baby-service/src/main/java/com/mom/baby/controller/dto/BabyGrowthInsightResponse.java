package com.mom.baby.controller.dto;

import java.math.BigDecimal;

public record BabyGrowthInsightResponse(
        GrowthRecordResponse latest,
        GrowthRecordResponse previous,
        BigDecimal weightDeltaKg,
        BigDecimal heightDeltaCm,
        BigDecimal headCircumferenceDeltaCm
) {
}
