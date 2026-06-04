package com.mom.baby.forecast.event;

import com.mom.baby.domain.BabyLogEntity;
import com.mom.baby.forecast.config.BabyForecastRabbitMqConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class BabyForecastEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishActivityRecorded(BabyLogEntity log, Long familyId) {
        BabyActivityRecordedMessage message = new BabyActivityRecordedMessage(
                UUID.randomUUID().toString(),
                log.getId(),
                log.getBabyId(),
                familyId,
                log.getLogType(),
                log.getValue(),
                log.getLoggedAt(),
                OffsetDateTime.now(),
                false
        );
        sendAfterCommit(message);
    }

    public void publishManualRefresh(Long babyId, Long familyId) {
        BabyActivityRecordedMessage message = new BabyActivityRecordedMessage(
                UUID.randomUUID().toString(),
                null,
                babyId,
                familyId,
                null,
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now(),
                true
        );
        sendAfterCommit(message);
    }

    private void sendAfterCommit(BabyActivityRecordedMessage message) {
        Runnable sendAction = () -> {
            try {
                rabbitTemplate.convertAndSend(
                        BabyForecastRabbitMqConfig.EXCHANGE,
                        BabyForecastRabbitMqConfig.ACTIVITY_RECORDED_ROUTING_KEY,
                        message
                );
                log.info("Published baby forecast message {} for baby {}", message.messageId(), message.babyId());
            } catch (Exception ex) {
                log.error("Failed to publish baby forecast message {} for baby {}", message.messageId(), message.babyId(), ex);
            }
        };

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
