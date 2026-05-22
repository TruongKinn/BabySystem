package com.mom.account.controller.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GrantFamilyQuestPointsRequest(
        @NotNull
        @Min(1)
        @Max(5_000_000)
        Integer points,
        @Size(max = 300)
        String reason
) {
}
