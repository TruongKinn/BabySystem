package com.mom.task.event;

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
public class TaskEventPublisher {

    private final KafkaTemplate<String, BaseEvent<?>> kafkaTemplate;

    public void publishTaskCreated(TaskChangedPayload payload) {
        publish(EventTopics.TASK_CREATED, payload);
    }

    public void publishTaskCompleted(TaskChangedPayload payload) {
        publish(EventTopics.TASK_COMPLETED, payload);
    }

    private void publish(String topic, TaskChangedPayload payload) {
        BaseEvent<TaskChangedPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                topic,
                OffsetDateTime.now(),
                payload.familyId(),
                payload.assigneeUserId(),
                payload
        );
        sendAfterCommit(topic, String.valueOf(payload.taskId()), event);
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
