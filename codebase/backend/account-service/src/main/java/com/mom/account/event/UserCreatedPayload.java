package com.mom.account.event;

public record UserCreatedPayload(
        Long userId,
        String username,
        String email,
        String displayName
) {
}
