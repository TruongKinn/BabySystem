package com.mom.ai.client.dto;

public record OpenAiInputContent(
        String type,
        String text
) {
    public static OpenAiInputContent inputText(String text) {
        return new OpenAiInputContent("input_text", text);
    }
}
