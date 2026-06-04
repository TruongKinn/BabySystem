package com.mom.baby.forecast.event;

import com.mom.baby.domain.BabyLogType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record BabyActivityRecordedMessage(
        String messageId,
        Long babyLogId,
        Long babyId,
        Long familyId,
        BabyLogType logType,
        BigDecimal value,
        OffsetDateTime loggedAt,
        OffsetDateTime recordedAt,
        boolean manualRefresh
) {
}
