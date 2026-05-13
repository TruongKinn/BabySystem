package com.mom.common.kafka;

import java.time.OffsetDateTime;

public record BaseEvent<T>(
        String eventId,
        String eventType,
        OffsetDateTime occurredAt,
        Long familyId,
        Long userId,
        T payload
) {
}
