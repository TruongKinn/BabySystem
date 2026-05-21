package com.mom.account.controller.dto;

import java.time.OffsetDateTime;

public record ResolvedFeatureAccessResponse(
        String featureKey,
        boolean enabled,
        String sourceStatus,
        OffsetDateTime expiresAt
) {
}
