package com.mom.expense.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mom.common.kafka.BaseEvent;
import com.mom.expense.domain.OutboxEventEntity;
import com.mom.expense.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher {

    private final ObjectMapper objectMapper;
    private final OutboxEventRepository outboxEventRepository;

    public void publish(String topic, String aggregateId, BaseEvent<?> event) {
        OutboxEventEntity entity = new OutboxEventEntity();
        entity.setAggregateType(topic);
        entity.setAggregateId(aggregateId);
        entity.setType(event.eventType());
        entity.setPayload(objectMapper.valueToTree(event));

        outboxEventRepository.save(entity);
        log.info("Stored outbox event {} for topic {} aggregateId={}", event.eventId(), topic, aggregateId);
    }
}
