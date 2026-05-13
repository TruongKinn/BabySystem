package com.mom.notification.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mom.common.kafka.EventTopics;
import com.mom.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    @KafkaListener(topics = EventTopics.NOTIFICATION_REQUESTED, groupId = "notification-service")
    public void onNotificationRequested(String rawEvent) {
        try {
            JsonNode event = objectMapper.readTree(rawEvent);
            Long familyId = asLong(event.path("familyId"));
            Long userId = asLong(event.path("userId"));

            JsonNode payloadNode = event.path("payload");
            NotificationRequestedPayload payload = new NotificationRequestedPayload(
                    payloadNode.path("channel").asText(null),
                    payloadNode.path("type").asText(null),
                    payloadNode.path("title").asText(null),
                    payloadNode.path("message").asText(null),
                    payloadNode.path("metadataJson").asText(null),
                    parseOffsetDateTime(payloadNode.path("scheduledAt").asText(null))
            );

            notificationService.createFromEvent(familyId, userId, payload);
        } catch (Exception ex) {
            log.error("Failed to consume notification.requested event", ex);
        }
    }

    private Long asLong(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isIntegralNumber()) {
            return node.longValue();
        }
        String value = node.asText(null);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private OffsetDateTime parseOffsetDateTime(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value)) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }
}
