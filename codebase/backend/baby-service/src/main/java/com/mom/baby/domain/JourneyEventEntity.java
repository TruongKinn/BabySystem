package com.mom.baby.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "journey_events")
public class JourneyEventEntity {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "title", length = 120, nullable = false)
    private String title;

    @Column(name = "story", length = 2000)
    private String story;

    @Column(name = "happened_at", nullable = false)
    private OffsetDateTime happenedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 16, nullable = false)
    private JourneyEventType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy", length = 16, nullable = false)
    private JourneyPrivacy privacy;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 16, nullable = false)
    private JourneyEventSource source;

    @Column(name = "source_ref", length = 120)
    private String sourceRef;

    @Column(name = "capsule_open_at")
    private OffsetDateTime capsuleOpenAt;

    @Column(name = "recipient", length = 120)
    private String recipient;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by", length = 120)
    private String createdBy;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
