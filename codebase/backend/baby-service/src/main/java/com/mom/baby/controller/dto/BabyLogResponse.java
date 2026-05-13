package com.mom.baby.controller.dto;

import com.mom.baby.domain.BabyLogType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BabyLogResponse(
        Long id,
        Long babyId,
        BabyLogType logType,
        BigDecimal value,
        String note,
        OffsetDateTime loggedAt
) {
}
