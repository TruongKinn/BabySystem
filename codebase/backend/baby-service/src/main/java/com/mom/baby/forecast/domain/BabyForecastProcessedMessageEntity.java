package com.mom.baby.forecast.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "baby_forecast_processed_messages")
public class BabyForecastProcessedMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false, length = 120)
    private String messageId;

    @Column(name = "queue_name", nullable = false, length = 120)
    private String queueName;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;
}
