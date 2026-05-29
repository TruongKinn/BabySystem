package com.mom.ai.service;

public record UserAccessContext(
        Long userId,
        String familyIds,
        boolean admin
) {
}
