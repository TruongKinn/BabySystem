package com.mom.baby.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "vaccine_schedule_configs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"vaccine_id", "dose_number"})
})
public class VaccineScheduleConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vaccine_id", nullable = false)
    private VaccineEntity vaccine;

    @Column(name = "dose_number", nullable = false)
    private int doseNumber;

    @Column(name = "recommended_age_months", nullable = false)
    private int recommendedAgeMonths;

    @Column(name = "min_days_since_previous_dose", nullable = false)
    private int minDaysSincePreviousDose = 0;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
