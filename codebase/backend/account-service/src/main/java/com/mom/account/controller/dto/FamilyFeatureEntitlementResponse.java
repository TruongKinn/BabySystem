package com.mom.account.controller.dto;

import com.mom.account.domain.PremiumFeatureStatus;

import java.time.OffsetDateTime;

public record FamilyFeatureEntitlementResponse(
        String featureKey,
        String featureName,
        String featureDescription,
        PremiumFeatureStatus status,
        OffsetDateTime expiresAt,
        String reason,
        Long updatedByUserId,
        OffsetDateTime updatedAt,
        boolean effectiveEnabled,
        String effectiveReason
) {
}
