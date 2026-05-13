package com.mom.baby.event;

import com.mom.baby.domain.BabyLogType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BabyLogCreatedPayload(
        Long babyLogId,
        Long babyId,
        Long familyId,
        BabyLogType logType,
        BigDecimal value,
        OffsetDateTime loggedAt
) {
}
