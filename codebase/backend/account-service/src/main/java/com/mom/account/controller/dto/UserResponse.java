package com.mom.account.controller.dto;

public record UserResponse(
        Long id,
        String username,
        String email,
        String displayName
) {
}
