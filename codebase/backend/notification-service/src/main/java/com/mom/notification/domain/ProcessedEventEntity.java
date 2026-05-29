package com.mom.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "processed_events")
public class ProcessedEventEntity {

    @Id
    @Column(name = "event_id", nullable = false, length = 100)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 150)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;

    @PrePersist
    void onCreate() {
        if (processedAt == null) {
            processedAt = OffsetDateTime.now();
        }
    }
}
