package com.mom.account.event;

import com.mom.common.kafka.BaseEvent;
import com.mom.common.kafka.EventTopics;
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
public class AccountEventPublisher {

    private final KafkaTemplate<String, BaseEvent<?>> kafkaTemplate;

    public void publishUserCreated(UserCreatedPayload payload) {
        BaseEvent<UserCreatedPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                EventTopics.USER_CREATED,
                OffsetDateTime.now(),
                null,
                payload.userId(),
                payload
        );
        sendAfterCommit(EventTopics.USER_CREATED, String.valueOf(payload.userId()), event);
    }

    public void publishFamilyCreated(FamilyCreatedPayload payload) {
        BaseEvent<FamilyCreatedPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                EventTopics.FAMILY_CREATED,
                OffsetDateTime.now(),
                payload.familyId(),
                payload.createdByUserId(),
                payload
        );
        sendAfterCommit(EventTopics.FAMILY_CREATED, String.valueOf(payload.familyId()), event);
    }

    private void sendAfterCommit(String topic, String key, BaseEvent<?> event) {
        Runnable sendAction = () -> kafkaTemplate.send(topic, key, event)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish event {} to topic {}", event.eventType(), topic, ex);
                        return;
                    }
                    if (result != null) {
                        log.info(
                                "Published event {} to topic {} partition={} offset={}",
                                event.eventType(),
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
