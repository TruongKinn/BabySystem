package com.mom.insight.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "insight_daily_stats")
public class InsightDailyStatEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "expense_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal expenseTotal = BigDecimal.ZERO;

    @Column(name = "expense_count", nullable = false)
    private long expenseCount;

    @Column(name = "meals_planned", nullable = false)
    private long mealsPlanned;

    @Column(name = "tasks_created", nullable = false)
    private long tasksCreated;

    @Column(name = "tasks_completed", nullable = false)
    private long tasksCompleted;

    @Column(name = "baby_sleep_hours", nullable = false, precision = 10, scale = 2)
    private BigDecimal babySleepHours = BigDecimal.ZERO;

    @Column(name = "baby_feedings", nullable = false)
    private long babyFeedings;

    @Column(name = "diaper_changes", nullable = false)
    private long diaperChanges;

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
