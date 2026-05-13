package com.mom.expense.event;

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
public class ExpenseEventPublisher {

    private final KafkaTemplate<String, BaseEvent<?>> kafkaTemplate;

    public void publishExpenseCreated(Long familyId, ExpenseChangedPayload payload) {
        publish(EventTopics.EXPENSE_CREATED, familyId, payload);
    }

    public void publishExpenseUpdated(Long familyId, ExpenseChangedPayload payload) {
        publish(EventTopics.EXPENSE_UPDATED, familyId, payload);
    }

    public void publishExpenseDeleted(Long familyId, ExpenseChangedPayload payload) {
        publish(EventTopics.EXPENSE_DELETED, familyId, payload);
    }

    private void publish(String topic, Long familyId, ExpenseChangedPayload payload) {
        BaseEvent<ExpenseChangedPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                topic,
                OffsetDateTime.now(),
                familyId,
                null,
                payload
        );
        sendAfterCommit(topic, String.valueOf(payload.expenseId()), event);
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
