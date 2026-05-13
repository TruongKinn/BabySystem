package com.mom.baby.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "baby_logs")
public class BabyLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "log_type", nullable = false, length = 32)
    private BabyLogType logType;

    @Column(precision = 10, scale = 2)
    private BigDecimal value;

    @Column(length = 500)
    private String note;

    @Column(name = "logged_at", nullable = false)
    private OffsetDateTime loggedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        if (loggedAt == null) {
            loggedAt = now;
        }
    }
}
