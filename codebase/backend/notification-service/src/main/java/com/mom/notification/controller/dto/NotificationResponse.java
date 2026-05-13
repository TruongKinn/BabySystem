package com.mom.notification.controller.dto;

import com.mom.notification.domain.NotificationChannel;
import com.mom.notification.domain.NotificationStatus;
import com.mom.notification.domain.NotificationType;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        Long familyId,
        Long userId,
        NotificationChannel channel,
        NotificationType type,
        String title,
        String message,
        String metadataJson,
        OffsetDateTime scheduledAt,
        OffsetDateTime sentAt,
        OffsetDateTime readAt,
        NotificationStatus status,
        String errorMessage
) {
}
