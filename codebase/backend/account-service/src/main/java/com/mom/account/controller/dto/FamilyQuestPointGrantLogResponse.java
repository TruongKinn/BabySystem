package com.mom.account.controller.dto;

import java.time.OffsetDateTime;

public record FamilyQuestPointGrantLogResponse(
        Long id,
        int points,
        String reason,
        Long grantedByUserId,
        OffsetDateTime grantedAt
) {
}
