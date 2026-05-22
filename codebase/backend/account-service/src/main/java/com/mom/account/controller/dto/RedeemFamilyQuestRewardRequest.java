package com.mom.account.controller.dto;

import jakarta.validation.constraints.NotBlank;

public record RedeemFamilyQuestRewardRequest(
        @NotBlank String rewardKey
) {
}
