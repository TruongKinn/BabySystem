package com.mom.account.controller.dto;

public record RedeemFamilyQuestRewardResponse(
        FamilyQuestStateResponse questState,
        FamilyQuestRewardRedemptionResponse redemption
) {
}
