package com.mom.account.controller.dto;

public record FamilyQuestRewardCatalogItemResponse(
        String rewardKey,
        String name,
        String description,
        int costPoints
) {
}
