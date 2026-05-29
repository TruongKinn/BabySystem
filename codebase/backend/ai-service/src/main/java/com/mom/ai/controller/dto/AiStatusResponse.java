package com.mom.ai.controller.dto;

public record AiStatusResponse(
        String provider,
        String model,
        boolean apiKeyConfigured
) {
}
