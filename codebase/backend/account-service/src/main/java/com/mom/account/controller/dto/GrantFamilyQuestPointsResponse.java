package com.mom.account.controller.dto;

public record GrantFamilyQuestPointsResponse(
        FamilyQuestStateResponse questState,
        FamilyQuestPointGrantLogResponse grant
) {
}
