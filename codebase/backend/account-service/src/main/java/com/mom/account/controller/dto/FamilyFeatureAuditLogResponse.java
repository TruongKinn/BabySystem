package com.mom.account.controller.dto;

import com.mom.account.domain.PremiumFeatureStatus;

import java.time.OffsetDateTime;

public record FamilyFeatureAuditLogResponse(
        Long id,
        String featureKey,
        PremiumFeatureStatus oldStatus,
        PremiumFeatureStatus newStatus,
        OffsetDateTime oldExpiresAt,
        OffsetDateTime newExpiresAt,
        String reason,
        Long changedByUserId,
        OffsetDateTime changedAt
) {
}
