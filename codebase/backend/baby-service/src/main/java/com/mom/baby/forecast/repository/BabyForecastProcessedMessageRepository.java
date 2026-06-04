package com.mom.baby.forecast.repository;

import com.mom.baby.forecast.domain.BabyForecastProcessedMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BabyForecastProcessedMessageRepository extends JpaRepository<BabyForecastProcessedMessageEntity, Long> {

    boolean existsByMessageIdAndQueueName(String messageId, String queueName);
}
