package com.mom.baby.forecast.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "baby_forecast_snapshots")
public class BabyForecastSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "forecast_date", nullable = false)
    private LocalDate forecastDate;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;

    @Column(name = "horizon_hours", nullable = false)
    private Integer horizonHours;

    @Column(name = "sleep_window_start")
    private OffsetDateTime sleepWindowStart;

    @Column(name = "sleep_window_end")
    private OffsetDateTime sleepWindowEnd;

    @Column(name = "feeding_window_start")
    private OffsetDateTime feedingWindowStart;

    @Column(name = "feeding_window_end")
    private OffsetDateTime feedingWindowEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 16)
    private BabyForecastRiskLevel riskLevel;

    @Column(nullable = false, length = 1000)
    private String summary;

    @Column(name = "recommendations_json", columnDefinition = "text")
    private String recommendationsJson;

    @Column(name = "signals_json", columnDefinition = "text")
    private String signalsJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
