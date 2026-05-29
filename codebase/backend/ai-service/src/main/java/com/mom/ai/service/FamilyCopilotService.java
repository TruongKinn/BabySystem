package com.mom.ai.service;

import com.mom.ai.client.OpenAiResponsesClient;
import com.mom.ai.client.GeminiClient;
import com.mom.ai.client.dto.OpenAiInputMessage;
import com.mom.ai.client.dto.OpenAiResponsesRequest;
import com.mom.ai.client.dto.OpenAiResponsesResponse;
import com.mom.ai.config.OpenAiProperties;
import com.mom.ai.controller.dto.AiChatMessage;
import com.mom.ai.controller.dto.AiChatRequest;
import com.mom.ai.controller.dto.AiChatResponse;
import com.mom.ai.controller.dto.AiStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class FamilyCopilotService {

    private static final int MAX_HISTORY_MESSAGES = 8;

    private final OpenAiResponsesClient openAiClient;
    private final GeminiClient geminiClient;
    private final OpenAiProperties properties;
    private final SystemPromptFactory promptFactory;

    public AiChatResponse chat(AiChatRequest request, UserAccessContext accessContext) {
        enforceFamilyAccess(request.familyId(), accessContext);

        List<OpenAiInputMessage> input = new ArrayList<>();
        if (request.history() != null && !request.history().isEmpty()) {
            request.history().stream()
                    .skip(Math.max(0, request.history().size() - MAX_HISTORY_MESSAGES))
                    .map(this::toOpenAiMessage)
                    .forEach(input::add);
        }
        input.add(OpenAiInputMessage.of("user", buildUserMessage(request)));

        OpenAiResponsesRequest openAiRequest = new OpenAiResponsesRequest(
                properties.getModel(),
                promptFactory.instructions(request.locale()),
                input,
                request.previousResponseId(),
                properties.getMaxOutputTokens()
        );

        OpenAiResponsesResponse response;
        if (isGemini()) {
            response = geminiClient.create(openAiRequest);
        } else {
            response = openAiClient.create(openAiRequest);
        }
        return new AiChatResponse(response.outputText(), response.model(), response.id(), response.usage());
    }

    public AiStatusResponse status() {
        String provider = isGemini() ? "gemini" : "openai";
        return new AiStatusResponse(provider, properties.getModel(), StringUtils.hasText(properties.getApiKey()));
    }

    private boolean isGemini() {
        String apiKey = properties.getApiKey();
        String model = properties.getModel();
        return (apiKey != null && apiKey.startsWith("AIzaSy")) || (model != null && model.toLowerCase().contains("gemini"));
    }

    private OpenAiInputMessage toOpenAiMessage(AiChatMessage message) {
        return OpenAiInputMessage.of(message.role(), message.content());
    }

    private String buildUserMessage(AiChatRequest request) {
        String context = StringUtils.hasText(request.context()) ? request.context().trim() : "No structured family context was provided.";
        return """
                Family ID: %d

                Family context:
                %s

                User question:
                %s
                """.formatted(request.familyId(), context, request.message().trim());
    }

    private void enforceFamilyAccess(Long familyId, UserAccessContext accessContext) {
        if (accessContext == null || accessContext.admin() || !StringUtils.hasText(accessContext.familyIds())) {
            return;
        }

        Set<Long> allowedFamilyIds = Stream.of(accessContext.familyIds().split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(Long::valueOf)
                .collect(Collectors.toSet());
        if (!allowedFamilyIds.contains(familyId)) {
            throw new AccessDeniedException("Forbidden by family data isolation policy");
        }
    }
}
