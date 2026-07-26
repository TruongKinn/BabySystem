package com.mom.baby.event;

import com.mom.common.kafka.BaseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class VaccinationEventPublisher {

    private static final String TOPIC_NAME = "vaccination-reminder-topic";

    private final KafkaTemplate<String, BaseEvent<?>> kafkaTemplate;

    public void publishVaccinationReminder(VaccinationReminderPayload payload) {
        BaseEvent<VaccinationReminderPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                "VACCINATION_REMINDER",
                OffsetDateTime.now(),
                payload.familyId(),
                null,
                payload
        );
        sendAfterCommit(TOPIC_NAME, String.valueOf(payload.babyId()) + "_" + payload.vaccineId(), event);
    }

    private void sendAfterCommit(String topic, String key, BaseEvent<?> event) {
        Runnable sendAction = () -> kafkaTemplate.send(topic, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish vaccination reminder event to topic {}", topic, ex);
                        return;
                    }
                    if (result != null) {
                        log.info(
                                "Published vaccination reminder event to topic {} partition={} offset={}",
                                topic,
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset()
                        );
                    }
                });

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            sendAction.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                sendAction.run();
            }
        });
    }
}
