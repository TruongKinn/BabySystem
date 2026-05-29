package com.mom.ai.client.dto;

public record OpenAiResponsesResponse(
        String id,
        String model,
        String outputText,
        OpenAiUsage usage
) {
}
