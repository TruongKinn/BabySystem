package com.mom.account.controller.dto;

public record PremiumFeatureResponse(
        String key,
        String name,
        String description,
        boolean active
) {
}
