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
            String eventId = event.path("eventId").asText(null);
            String eventType = event.path("eventType").asText(null);
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

            notificationService.createFromEventOnce(eventId, eventType, familyId, userId, payload);
        } catch (Exception ex) {
            log.error("Failed to consume notification.requested event", ex);
            throw new IllegalStateException("Failed to consume notification.requested event", ex);
        }
    }

    @KafkaListener(
            topics = {
                    EventTopics.EXPENSE_PROPOSAL_SUBMITTED,
                    EventTopics.EXPENSE_PROPOSAL_APPROVED,
                    EventTopics.EXPENSE_PROPOSAL_REJECTED,
                    EventTopics.EXPENSE_PROPOSAL_RESUBMITTED,
                    EventTopics.EXPENSE_PROPOSAL_APPROVAL_STARTED,
                    EventTopics.EXPENSE_PROPOSAL_APPROVAL_COMPLETED,
                    EventTopics.EXPENSE_PROPOSAL_APPROVAL_FAILED,
                    EventTopics.EXPENSE_PROPOSAL_APPROVAL_COMPENSATED
            },
            groupId = "notification-service"
    )
    public void onExpenseProposalSagaEvent(String rawEvent) {
        try {
            JsonNode event = objectMapper.readTree(rawEvent);
            String eventId = event.path("eventId").asText(null);
            String eventType = event.path("eventType").asText(null);
            JsonNode payloadNode = event.path("payload");
            Long familyId = asLong(event.path("familyId"));
            if (familyId == null) {
                familyId = asLong(payloadNode.path("familyId"));
            }

            NotificationRequestedPayload payload = new NotificationRequestedPayload(
                    "PUSH",
                    "EXPENSE",
                    proposalNotificationTitle(payloadNode.path("action").asText(null)),
                    proposalNotificationMessage(payloadNode),
                    proposalMetadataJson(event, payloadNode),
                    OffsetDateTime.now()
            );

            notificationService.createFromEventOnce(eventId, eventType, familyId, null, payload);
        } catch (Exception ex) {
            log.error("Failed to consume expense proposal saga event", ex);
            throw new IllegalStateException("Failed to consume expense proposal saga event", ex);
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

    private String proposalNotificationTitle(String action) {
        if ("APPROVED".equalsIgnoreCase(action)) {
            return "Expense proposal approved";
        }
        if ("APPROVAL_STARTED".equalsIgnoreCase(action)) {
            return "Expense approval started";
        }
        if ("APPROVAL_COMPLETED".equalsIgnoreCase(action)) {
            return "Expense approval completed";
        }
        if ("APPROVAL_FAILED".equalsIgnoreCase(action)) {
            return "Expense approval failed";
        }
        if ("APPROVAL_COMPENSATED".equalsIgnoreCase(action)) {
            return "Expense approval compensated";
        }
        if ("REJECTED".equalsIgnoreCase(action)) {
            return "Expense proposal rejected";
        }
        if ("RESUBMITTED".equalsIgnoreCase(action)) {
            return "Expense proposal resubmitted";
        }
        return "Expense proposal submitted";
    }

    private String proposalNotificationMessage(JsonNode payloadNode) {
        String title = payloadNode.path("title").asText("Expense proposal");
        String proposedBy = payloadNode.path("proposedBy").asText("A family member");
        String approver = payloadNode.path("approver").asText("the approver");
        String amount = payloadNode.path("amount").asText("");
        String action = payloadNode.path("action").asText("");

        if ("APPROVED".equalsIgnoreCase(action)) {
            return "Approved expense proposal \"" + title + "\" for " + amount + ".";
        }
        if ("APPROVAL_STARTED".equalsIgnoreCase(action)) {
            return "Started approval saga for expense proposal \"" + title + "\".";
        }
        if ("APPROVAL_COMPLETED".equalsIgnoreCase(action)) {
            return "Completed approval saga for expense proposal \"" + title + "\" and created the expense.";
        }
        if ("APPROVAL_FAILED".equalsIgnoreCase(action)) {
            String reason = payloadNode.path("rejectReason").asText("");
            return "Approval saga failed for expense proposal \"" + title + "\". Reason: " + reason;
        }
        if ("APPROVAL_COMPENSATED".equalsIgnoreCase(action)) {
            String reason = payloadNode.path("rejectReason").asText("");
            return "Compensated approval saga for expense proposal \"" + title + "\". Reason: " + reason;
        }
        if ("REJECTED".equalsIgnoreCase(action)) {
            String reason = payloadNode.path("rejectReason").asText("");
            return "Rejected expense proposal \"" + title + "\". Reason: " + reason;
        }
        if ("RESUBMITTED".equalsIgnoreCase(action)) {
            return proposedBy + " resubmitted expense proposal \"" + title + "\" to " + approver + ".";
        }
        return proposedBy + " submitted expense proposal \"" + title + "\" to " + approver + ".";
    }

    private String proposalMetadataJson(JsonNode event, JsonNode payloadNode) {
        return objectMapper.createObjectNode()
                .put("eventId", event.path("eventId").asText(null))
                .put("eventType", event.path("eventType").asText(null))
                .put("proposalId", payloadNode.path("proposalId").asLong())
                .put("familyId", payloadNode.path("familyId").asLong())
                .put("status", payloadNode.path("status").asText(null))
                .toString();
    }
}
