package com.mom.baby.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "vaccinations", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"baby_id", "vaccine_id", "dose_number"})
})
public class VaccinationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vaccine_id")
    private VaccineEntity vaccine;

    @Column(name = "vaccine_name", length = 160)
    private String vaccineName;

    @Column(name = "dose_number", nullable = false)
    private int doseNumber = 1;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false)
    private boolean completed;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(length = 200)
    private String facility;

    @Column(name = "post_reaction", length = 500)
    private String postReaction;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
        if (completed && completedAt == null) {
            completedAt = OffsetDateTime.now();
        }
    }

    @PreUpdate
    void onUpdate() {
        if (completed && completedAt == null) {
            completedAt = OffsetDateTime.now();
        }
    }
}
