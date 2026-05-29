package com.mom.baby.controller.dto;

import com.mom.baby.domain.JourneyEventSource;
import com.mom.baby.domain.JourneyEventType;
import com.mom.baby.domain.JourneyPrivacy;

import java.time.OffsetDateTime;

public record JourneyEventResponse(
        String id,
        Long babyId,
        String title,
        String story,
        OffsetDateTime happenedAt,
        JourneyEventType type,
        JourneyPrivacy privacy,
        JourneyEventSource source,
        String sourceRef,
        OffsetDateTime capsuleOpenAt,
        String recipient,
        OffsetDateTime createdAt,
        String createdBy
) {
}
