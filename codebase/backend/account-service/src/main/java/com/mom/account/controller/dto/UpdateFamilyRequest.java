package com.mom.account.controller.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateFamilyRequest(
        @NotBlank String name
) {
}
