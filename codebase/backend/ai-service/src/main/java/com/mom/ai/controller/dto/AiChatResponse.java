package com.mom.ai.controller.dto;

import com.mom.ai.client.dto.OpenAiUsage;

public record AiChatResponse(
        String answer,
        String model,
        String responseId,
        OpenAiUsage usage
) {
}
