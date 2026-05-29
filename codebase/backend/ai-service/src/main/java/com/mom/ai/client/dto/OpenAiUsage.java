package com.mom.ai.client.dto;

public record OpenAiUsage(
        Integer inputTokens,
        Integer outputTokens,
        Integer totalTokens
) {
}
