package com.mom.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mom.ai.client.dto.OpenAiInputContent;
import com.mom.ai.client.dto.OpenAiInputMessage;
import com.mom.ai.client.dto.OpenAiResponsesRequest;
import com.mom.ai.client.dto.OpenAiResponsesResponse;
import com.mom.ai.client.dto.OpenAiUsage;
import com.mom.ai.config.OpenAiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import java.util.stream.Collectors;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiClient {

    private final ObjectMapper objectMapper;
    private final OpenAiProperties properties;

    public OpenAiResponsesResponse create(OpenAiResponsesRequest request) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        // Map OpenAI/old models to Gemini equivalent if needed (gemini-1.5-flash is not supported for this key/version)
        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash"; // Map to a stable, supported model in this 2026 environment
        }

        // Build Gemini API URL
        String url = String.format("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        // Build Gemini Request Body
        ObjectNode geminiPayload = buildGeminiPayload(request);

        Duration timeout = properties.getTimeout();
        try {
            log.info("Calling Gemini API with model: {}", geminiModel);
            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(geminiPayload)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            return mapGeminiResponse(responseJson, geminiModel);
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini API call failed", ex);
            throw new OpenAiApiException(502, "Gemini API request failed: " + ex.getMessage());
        }
    }

    private ObjectNode buildGeminiPayload(OpenAiResponsesRequest request) {
        ObjectNode root = objectMapper.createObjectNode();

        // 1. Contents (History + User Message)
        // NOTE: Gemini v1 does NOT support top-level "systemInstruction" field.
        // Workaround: prepend the system instructions as the very first user message.
        ArrayNode contentsNode = root.putArray("contents");
        if (StringUtils.hasText(request.instructions())) {
            // Add system prompt as the first user turn, followed by a model acknowledgement
            // This creates a "few-shot" style system prompt that works reliably in v1
            ObjectNode systemTurn = contentsNode.addObject();
            systemTurn.put("role", "user");
            systemTurn.putArray("parts").addObject().put("text",
                    "[System Instructions]\n" + request.instructions());

            ObjectNode systemAck = contentsNode.addObject();
            systemAck.put("role", "model");
            systemAck.putArray("parts").addObject().put("text",
                    "Understood. I will follow these instructions.");
        }

        if (request.input() != null) {
            for (OpenAiInputMessage msg : request.input()) {
                ObjectNode contentItem = contentsNode.addObject();
                
                // Map roles: assistant -> model
                String role = msg.role();
                if ("assistant".equalsIgnoreCase(role)) {
                    role = "model";
                } else if (!"user".equalsIgnoreCase(role)) {
                    role = "user"; // Default to user if any system/other role sneaks in
                }
                
                contentItem.put("role", role);
                ArrayNode partsNode = contentItem.putArray("parts");
                
                String text = "";
                if (msg.content() != null) {
                    text = msg.content().stream()
                            .map(OpenAiInputContent::text)
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.joining("\n"));
                }
                partsNode.addObject().put("text", text);
            }
        }

        // 3. Generation Config
        ObjectNode generationConfig = root.putObject("generationConfig");
        if (request.maxOutputTokens() != null) {
            generationConfig.put("maxOutputTokens", request.maxOutputTokens());
        }
        generationConfig.put("temperature", 0.7);

        return root;
    }

    private OpenAiResponsesResponse mapGeminiResponse(JsonNode root, String model) {
        if (root == null || root.isMissingNode() || root.isNull()) {
            throw new OpenAiApiException(502, "Empty response from Gemini API");
        }

        // Extract output text
        String outputText = "";
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode firstCandidate = candidates.get(0);
            JsonNode parts = firstCandidate.path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                outputText = parts.get(0).path("text").asText();
            }
        }

        // Extract usage
        OpenAiUsage usage = null;
        JsonNode usageMetadata = root.path("usageMetadata");
        if (!usageMetadata.isMissingNode() && !usageMetadata.isNull()) {
            usage = new OpenAiUsage(
                    usageMetadata.path("promptTokenCount").asInt(0),
                    usageMetadata.path("candidatesTokenCount").asInt(0),
                    usageMetadata.path("totalTokenCount").asInt(0)
            );
        }

        String responseId = "gemini-" + System.currentTimeMillis();
        return new OpenAiResponsesResponse(responseId, model, outputText, usage);
    }

    public String ocrReceipt(String base64Data, String mimeType, String promptText) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash";
        }

        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode contentsNode = root.putArray("contents");
            ObjectNode turnNode = contentsNode.addObject();
            turnNode.put("role", "user");
            ArrayNode partsNode = turnNode.putArray("parts");
            
            // Text part
            partsNode.addObject().put("text", promptText);
            
            // InlineData part
            ObjectNode inlineDataNode = partsNode.addObject().putObject("inlineData");
            inlineDataNode.put("mimeType", mimeType);
            inlineDataNode.put("data", base64Data);

            // Generation config
            ObjectNode generationConfig = root.putObject("generationConfig");
            generationConfig.put("responseMimeType", "application/json");
            
            // Schema
            ObjectNode schemaNode = generationConfig.putObject("responseSchema");
            schemaNode.put("type", "OBJECT");
            ObjectNode propertiesNode = schemaNode.putObject("properties");
            
            propertiesNode.putObject("amount").put("type", "INTEGER");
            propertiesNode.putObject("date").put("type", "STRING");
            propertiesNode.putObject("category").put("type", "STRING");
            propertiesNode.putObject("note").put("type", "STRING");
            
            ArrayNode requiredNode = schemaNode.putArray("required");
            requiredNode.add("amount");
            requiredNode.add("category");
            requiredNode.add("note");

            Duration timeout = properties.getTimeout();
            log.info("Calling Gemini OCR API with model: {}", geminiModel);
            
            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(root)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini OCR request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini OCR API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            if (responseJson == null) {
                throw new OpenAiApiException(502, "Empty response from Gemini OCR API");
            }

            String outputText = "";
            JsonNode candidates = responseJson.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    outputText = parts.get(0).path("text").asText();
                }
            }
            return outputText;
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini OCR API call failed", ex);
            throw new OpenAiApiException(502, "Gemini OCR API request failed: " + ex.getMessage());
        }
    }
}
