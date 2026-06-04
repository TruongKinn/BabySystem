package com.mom.baby.forecast.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "baby_forecast_anomalies")
public class BabyForecastAnomalyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "source_log_id")
    private Long sourceLogId;

    @Column(name = "anomaly_type", nullable = false, length = 64)
    private String anomalyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private BabyForecastRiskLevel severity;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "detected_at", nullable = false)
    private OffsetDateTime detectedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Column(name = "metadata_json", columnDefinition = "text")
    private String metadataJson;
}
