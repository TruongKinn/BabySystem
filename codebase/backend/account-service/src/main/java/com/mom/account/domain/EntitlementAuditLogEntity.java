package com.mom.account.domain;

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
@Table(name = "entitlement_audit_logs")
public class EntitlementAuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "feature_key", nullable = false, length = 120)
    private String featureKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", length = 16)
    private PremiumFeatureStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 16)
    private PremiumFeatureStatus newStatus;

    @Column(name = "old_expires_at")
    private OffsetDateTime oldExpiresAt;

    @Column(name = "new_expires_at")
    private OffsetDateTime newExpiresAt;

    @Column(length = 300)
    private String reason;

    @Column(name = "changed_by_user_id")
    private Long changedByUserId;

    @Column(name = "changed_at", nullable = false)
    private OffsetDateTime changedAt = OffsetDateTime.now();
}
