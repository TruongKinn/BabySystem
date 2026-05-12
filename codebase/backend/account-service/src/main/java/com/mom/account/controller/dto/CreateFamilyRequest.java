package com.mom.account.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateFamilyRequest(
        @NotBlank String name,
        @NotNull Long createdByUserId
) {
}
