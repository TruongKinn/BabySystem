package com.mom.insight.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mom.common.kafka.EventTopics;
import com.mom.insight.service.InsightService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Slf4j
@Component
@RequiredArgsConstructor
public class InsightEventListener {

    private final ObjectMapper objectMapper;
    private final InsightService insightService;

    @KafkaListener(topics = EventTopics.EXPENSE_CREATED, groupId = "insight-service")
    public void onExpenseCreated(String rawEvent) {
        processSafely(rawEvent, event -> {
            Long familyId = asLong(event.path("familyId"));
            JsonNode payload = event.path("payload");
            BigDecimal amount = asDecimal(payload.path("amount"));
            LocalDate date = parseOffsetDate(payload.path("spentAt").asText(null));
            if (familyId != null && amount != null) {
                insightService.recordExpenseCreated(familyId, date, amount);
            }
        });
    }

    @KafkaListener(topics = EventTopics.MEAL_PLAN_CREATED, groupId = "insight-service")
    public void onMealPlanCreated(String rawEvent) {
        processSafely(rawEvent, event -> {
            Long familyId = asLong(event.path("familyId"));
            JsonNode payload = event.path("payload");
            LocalDate date = asLocalDate(payload.path("planDate").asText(null));
            if (familyId != null) {
                insightService.recordMealPlanCreated(familyId, date);
            }
        });
    }

    @KafkaListener(topics = EventTopics.TASK_CREATED, groupId = "insight-service")
    public void onTaskCreated(String rawEvent) {
        processSafely(rawEvent, event -> {
            Long familyId = asLong(event.path("familyId"));
            JsonNode payload = event.path("payload");
            LocalDate date = parseOffsetDate(payload.path("dueAt").asText(null));
            if (familyId != null) {
                insightService.recordTaskCreated(familyId, date);
            }
        });
    }

    @KafkaListener(topics = EventTopics.TASK_COMPLETED, groupId = "insight-service")
    public void onTaskCompleted(String rawEvent) {
        processSafely(rawEvent, event -> {
            Long familyId = asLong(event.path("familyId"));
            JsonNode payload = event.path("payload");
            LocalDate date = parseOffsetDate(payload.path("completedAt").asText(null));
            if (familyId != null) {
                insightService.recordTaskCompleted(familyId, date);
            }
        });
    }

    @KafkaListener(topics = EventTopics.BABY_LOG_CREATED, groupId = "insight-service")
    public void onBabyLogCreated(String rawEvent) {
        processSafely(rawEvent, event -> {
            Long familyId = asLong(event.path("familyId"));
            JsonNode payload = event.path("payload");
            LocalDate date = parseOffsetDate(payload.path("loggedAt").asText(null));
            String logType = payload.path("logType").asText(null);
            BigDecimal value = asDecimal(payload.path("value"));
            if (familyId != null && logType != null) {
                insightService.recordBabyLogCreated(familyId, date, logType, value);
            }
        });
    }

    private void processSafely(String rawEvent, EventProcessor processor) {
        try {
            JsonNode event = objectMapper.readTree(rawEvent);
            processor.process(event);
        } catch (Exception ex) {
            log.error("Failed to process insight event", ex);
        }
    }

    private Long asLong(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isIntegralNumber()) {
            return node.longValue();
        }
        String text = node.asText(null);
        if (text == null || text.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal asDecimal(JsonNode node) {
        if (node == null || node.isNull()) {
            return BigDecimal.ZERO;
        }
        if (node.isNumber()) {
            return node.decimalValue();
        }
        String text = node.asText(null);
        if (text == null || text.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException ex) {
            return BigDecimal.ZERO;
        }
    }

    private LocalDate parseOffsetDate(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value)) {
            return LocalDate.now(ZoneOffset.UTC);
        }
        try {
            return OffsetDateTime.parse(value).toLocalDate();
        } catch (Exception ex) {
            return LocalDate.now(ZoneOffset.UTC);
        }
    }

    private LocalDate asLocalDate(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value)) {
            return LocalDate.now(ZoneOffset.UTC);
        }
        try {
            return LocalDate.parse(value);
        } catch (Exception ex) {
            return LocalDate.now(ZoneOffset.UTC);
        }
    }

    @FunctionalInterface
    private interface EventProcessor {
        void process(JsonNode event) throws Exception;
    }
}
