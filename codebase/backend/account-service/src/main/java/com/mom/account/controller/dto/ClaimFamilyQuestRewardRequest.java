package com.mom.account.controller.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ClaimFamilyQuestRewardRequest(
        @NotNull
        @Min(1)
        @Max(500)
        Integer rewardPoints
) {
}
