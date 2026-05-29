package com.mom.ai.client.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OpenAiResponsesRequest(
        String model,
        String instructions,
        List<OpenAiInputMessage> input,
        @JsonProperty("previous_response_id") String previousResponseId,
        @JsonProperty("max_output_tokens") Integer maxOutputTokens
) {
}
