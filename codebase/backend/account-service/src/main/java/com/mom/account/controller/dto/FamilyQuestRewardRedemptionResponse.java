package com.mom.account.controller.dto;

import java.time.OffsetDateTime;

public record FamilyQuestRewardRedemptionResponse(
        Long id,
        String rewardKey,
        String rewardName,
        int costPoints,
        Long redeemedByUserId,
        OffsetDateTime redeemedAt
) {
}
