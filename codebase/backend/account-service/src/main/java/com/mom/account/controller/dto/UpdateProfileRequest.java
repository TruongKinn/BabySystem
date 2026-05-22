package com.mom.account.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Email @Size(max = 255) String email,
        LocalDate dateOfBirth
) {
}
