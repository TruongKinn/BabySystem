package com.mom.ai.client.dto;

import java.util.List;

public record OpenAiInputMessage(
        String role,
        List<OpenAiInputContent> content
) {
    public static OpenAiInputMessage of(String role, String text) {
        return new OpenAiInputMessage(role, List.of(OpenAiInputContent.inputText(text)));
    }
}
