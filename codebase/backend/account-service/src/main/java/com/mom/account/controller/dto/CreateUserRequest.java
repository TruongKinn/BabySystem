package com.mom.account.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateUserRequest(
        Long id,
        @NotBlank String username,
        @NotBlank @Email String email,
        @NotBlank String displayName
) {
}
