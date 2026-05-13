package com.mom.notification.event;

import java.time.OffsetDateTime;

public record NotificationRequestedPayload(
        String channel,
        String type,
        String title,
        String message,
        String metadataJson,
        OffsetDateTime scheduledAt
) {
}
