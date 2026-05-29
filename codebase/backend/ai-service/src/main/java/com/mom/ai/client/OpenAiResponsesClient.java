package com.mom.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.mom.ai.client.dto.OpenAiResponsesRequest;
import com.mom.ai.client.dto.OpenAiResponsesResponse;
import com.mom.ai.client.dto.OpenAiUsage;
import com.mom.ai.config.OpenAiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeoutException;

@Component
@RequiredArgsConstructor
public class OpenAiResponsesClient {

    private final WebClient openAiWebClient;
    private final OpenAiProperties properties;

    public OpenAiResponsesResponse create(OpenAiResponsesRequest request) {
        if (!StringUtils.hasText(properties.getApiKey())) {
            throw new OpenAiConfigurationException("OPENAI_API_KEY is not configured");
        }

        Duration timeout = properties.getTimeout();
        try {
            return openAiWebClient.post()
                    .uri(properties.getResponsesPath())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("OpenAI request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .map(this::mapResponse)
                    .block();
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            if (ex.getCause() instanceof TimeoutException) {
                throw new OpenAiApiException(504, "OpenAI request timed out after " + timeout.toSeconds() + " seconds");
            }
            throw new OpenAiApiException(502, "OpenAI request failed: " + ex.getMessage());
        }
    }

    private OpenAiResponsesResponse mapResponse(JsonNode root) {
        String id = textValue(root, "id");
        String model = textValue(root, "model");
        String answer = extractOutputText(root);
        OpenAiUsage usage = extractUsage(root.path("usage"));
        return new OpenAiResponsesResponse(id, model, answer, usage);
    }

    private String extractOutputText(JsonNode root) {
        String direct = textValue(root, "output_text");
        if (StringUtils.hasText(direct)) {
            return direct;
        }

        List<String> fragments = new ArrayList<>();
        JsonNode output = root.path("output");
        if (output.isArray()) {
            for (JsonNode item : output) {
                JsonNode content = item.path("content");
                if (content.isArray()) {
                    for (JsonNode part : content) {
                        String text = textValue(part, "text");
                        if (StringUtils.hasText(text)) {
                            fragments.add(text);
                        }
                    }
                }
            }
        }
        return String.join("\n", fragments).trim();
    }

    private OpenAiUsage extractUsage(JsonNode usage) {
        if (usage == null || usage.isMissingNode() || usage.isNull()) {
            return null;
        }
        return new OpenAiUsage(
                intValue(usage, "input_tokens"),
                intValue(usage, "output_tokens"),
                intValue(usage, "total_tokens")
        );
    }

    private String textValue(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isTextual() ? value.asText() : null;
    }

    private Integer intValue(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isNumber() ? value.asInt() : null;
    }
}
