package com.mom.ai.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiVaultConfigLogger implements ApplicationRunner {

    private final OpenAiProperties openAiProperties;
    private final ConfigurableEnvironment environment;

    @Override
    public void run(ApplicationArguments args) {
        log.info(
                "[AI Vault] uri={}, backend={}, defaultContext={}, vaultPropertySources={}",
                environment.getProperty("spring.cloud.vault.uri", "not-configured"),
                environment.getProperty("spring.cloud.vault.kv.backend", "secret"),
                environment.getProperty("spring.cloud.vault.kv.default-context", "ai-service"),
                vaultPropertySourceNames()
        );

        log.info(
                "[AI Vault] resolved OPENAI config: apiKeyPresent={}, apiKeyMasked={}, model={}, baseUrl={}, responsesPath={}, maxOutputTokens={}, timeout={}",
                hasText(openAiProperties.getApiKey()),
                maskSecret(openAiProperties.getApiKey()),
                openAiProperties.getModel(),
                openAiProperties.getBaseUrl(),
                openAiProperties.getResponsesPath(),
                openAiProperties.getMaxOutputTokens(),
                openAiProperties.getTimeout()
        );

        if (!hasText(openAiProperties.getApiKey())) {
            log.warn("[AI Vault] OPENAI_API_KEY is empty. Check Vault path secret/ai-service or environment override.");
        }
    }

    private List<String> vaultPropertySourceNames() {
        List<String> names = new ArrayList<>();
        for (PropertySource<?> propertySource : environment.getPropertySources()) {
            String name = propertySource.getName();
            if (name.toLowerCase().contains("vault")) {
                names.add(name);
            }
        }
        return names;
    }

    private String maskSecret(String secret) {
        if (!hasText(secret)) {
            return "<empty>";
        }

        String trimmed = secret.trim();
        if (trimmed.length() <= 10) {
            return "***";
        }

        return trimmed.substring(0, 6) + "..." + trimmed.substring(trimmed.length() - 4);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
