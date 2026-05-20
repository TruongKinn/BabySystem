package com.mom.account.controller.dto;

import java.time.LocalDate;

public record UserResponse(
        Long id,
        String username,
        String email,
        String displayName,
        LocalDate dateOfBirth
) {
}
