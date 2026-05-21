package com.mom.account.controller.dto;

import com.mom.account.domain.PremiumFeatureStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

public record UpsertFamilyFeatureEntitlementRequest(
        @NotBlank String featureKey,
        @NotNull PremiumFeatureStatus status,
        OffsetDateTime expiresAt,
        @Size(max = 300) String reason
) {
}
