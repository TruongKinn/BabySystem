package com.mom.notification.controller.dto;

import com.mom.notification.domain.NotificationChannel;
import com.mom.notification.domain.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record CreateNotificationRequest(
        @NotNull Long familyId,
        Long userId,
        NotificationChannel channel,
        NotificationType type,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 1000) String message,
        @Size(max = 4000) String metadataJson,
        OffsetDateTime scheduledAt
) {
}
