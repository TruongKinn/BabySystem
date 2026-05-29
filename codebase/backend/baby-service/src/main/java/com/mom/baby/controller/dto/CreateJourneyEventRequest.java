package com.mom.baby.controller.dto;

import com.mom.baby.domain.JourneyEventSource;
import com.mom.baby.domain.JourneyEventType;
import com.mom.baby.domain.JourneyPrivacy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record CreateJourneyEventRequest(
        @NotBlank @Size(max = 36) String id,
        @NotBlank @Size(max = 120) String title,
        @Size(max = 2000) String story,
        @NotNull OffsetDateTime happenedAt,
        @NotNull JourneyEventType type,
        @NotNull JourneyPrivacy privacy,
        @NotNull JourneyEventSource source,
        @Size(max = 120) String sourceRef,
        OffsetDateTime capsuleOpenAt,
        @Size(max = 120) String recipient,
        @NotNull OffsetDateTime createdAt,
        @Size(max = 120) String createdBy
) {
}
