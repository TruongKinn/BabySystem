package vn.agent.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class GatewayApiCatalogService {

    private static final Set<String> SUPPORTED_METHODS = Set.of(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD");
    private static final String API_DOCS_SUFFIX = "/v3/api-docs";
    private static final String API_PREFIX = "/api";

    private final WebClient.Builder webClientBuilder;

    @Value("${permission.discovery.gateway-base-url:http://localhost:4953}")
    private String gatewayBaseUrl;

    @Value("${permission.discovery.swagger-config-path:/v3/api-docs/swagger-config}")
    private String swaggerConfigPath;

    @Value("${permission.discovery.request-timeout:5s}")
    private Duration requestTimeout;

    public List<DiscoveredApiEndpoint> discoverApiEndpoints(String authorizationHeader) {
        Optional<JsonNode> configNode = fetchJson(swaggerConfigPath, authorizationHeader);
        if (configNode.isEmpty()) {
            return List.of();
        }

        List<ApiDocTarget> targets = extractTargets(configNode.get());
        if (targets.isEmpty()) {
            return List.of();
        }

        Map<String, DiscoveredApiEndpoint> discovered = new LinkedHashMap<>();
        for (ApiDocTarget target : targets) {
            Optional<JsonNode> apiDocNode = fetchJson(target.url(), authorizationHeader);
            if (apiDocNode.isEmpty()) {
                continue;
            }

            for (DiscoveredApiEndpoint endpoint : extractEndpoints(target, apiDocNode.get())) {
                String dedupKey = buildKey(endpoint.method(), endpoint.path());
                discovered.putIfAbsent(dedupKey, endpoint);
            }
        }

        return discovered.values().stream()
                .sorted((left, right) -> {
                    int pathCompare = left.path().compareToIgnoreCase(right.path());
                    if (pathCompare != 0) {
                        return pathCompare;
                    }
                    return left.method().compareToIgnoreCase(right.method());
                })
                .toList();
    }

    private List<ApiDocTarget> extractTargets(JsonNode configNode) {
        List<ApiDocTarget> targets = new ArrayList<>();
        JsonNode urlsNode = configNode.path("urls");
        if (urlsNode.isArray()) {
            for (JsonNode item : urlsNode) {
                String url = item.path("url").asText(null);
                if (!StringUtils.hasText(url)) {
                    continue;
                }
                String name = item.path("name").asText(url);
                targets.add(new ApiDocTarget(name, url));
            }
        }

        if (!targets.isEmpty()) {
            return targets;
        }

        String fallbackUrl = configNode.path("url").asText(null);
        if (StringUtils.hasText(fallbackUrl)) {
            targets.add(new ApiDocTarget("default", fallbackUrl));
        }
        return targets;
    }

    private List<DiscoveredApiEndpoint> extractEndpoints(ApiDocTarget target, JsonNode apiDocNode) {
        JsonNode pathsNode = apiDocNode.path("paths");
        if (!pathsNode.isObject()) {
            return List.of();
        }

        List<DiscoveredApiEndpoint> endpoints = new ArrayList<>();
        String routePrefix = extractRoutePrefix(target.url());
        for (Map.Entry<String, JsonNode> pathEntry : iterable(pathsNode.fields())) {
            String rawPath = normalizePath(pathEntry.getKey());
            if (!StringUtils.hasText(rawPath)) {
                continue;
            }

            JsonNode pathConfig = pathEntry.getValue();
            if (!pathConfig.isObject()) {
                continue;
            }

            for (Map.Entry<String, JsonNode> methodEntry : iterable(pathConfig.fields())) {
                String method = methodEntry.getKey() == null
                        ? null
                        : methodEntry.getKey().toUpperCase(Locale.ROOT);
                if (!SUPPORTED_METHODS.contains(method)) {
                    continue;
                }

                String externalPath = normalizePath(routePrefix + adaptPathForGateway(routePrefix, rawPath));
                if (!StringUtils.hasText(externalPath)) {
                    continue;
                }

                endpoints.add(new DiscoveredApiEndpoint(target.name(), method, externalPath));
            }
        }
        return endpoints;
    }

    private String adaptPathForGateway(String routePrefix, String path) {
        if (!StringUtils.hasText(path)) {
            return path;
        }

        if (!path.startsWith(API_PREFIX + "/") && !path.equals(API_PREFIX)) {
            return path;
        }

        if (routePrefix.equals("/auth")
                || routePrefix.equals("/common")
                || routePrefix.equals("/logistics")
                || routePrefix.equals("/shipment")
                || routePrefix.equals("/tracking")
                || routePrefix.equals("/driver")
                || routePrefix.equals("/vehicle")
                || routePrefix.equals("/batch-job")
                || routePrefix.equals("/job-supervisor")
                || routePrefix.equals("/todo")
                || routePrefix.equals("/finance")) {
            return path;
        }

        if (path.equals(API_PREFIX)) {
            return "/";
        }

        return path.substring(API_PREFIX.length());
    }

    private String extractRoutePrefix(String apiDocUrl) {
        if (!StringUtils.hasText(apiDocUrl)) {
            return "";
        }

        String relativePath = extractRelativePath(apiDocUrl);
        int index = relativePath.indexOf(API_DOCS_SUFFIX);
        if (index < 0) {
            return "";
        }
        return normalizePath(relativePath.substring(0, index));
    }

    private Optional<JsonNode> fetchJson(String pathOrUrl, String authorizationHeader) {
        String uri = toAbsoluteUri(pathOrUrl);
        try {
            JsonNode node = webClientBuilder.build()
                    .get()
                    .uri(uri)
                    .headers(headers -> {
                        if (StringUtils.hasText(authorizationHeader)) {
                            headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
                        }
                    })
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(requestTimeout)
                    .block();
            return Optional.ofNullable(node);
        } catch (Exception exception) {
            log.warn("Unable to load OpenAPI payload from {}: {}", uri, exception.getMessage());
            return Optional.empty();
        }
    }

    private String toAbsoluteUri(String pathOrUrl) {
        if (!StringUtils.hasText(pathOrUrl)) {
            return gatewayBaseUrl;
        }

        String value = pathOrUrl.trim();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return value;
        }

        String base = gatewayBaseUrl.endsWith("/")
                ? gatewayBaseUrl.substring(0, gatewayBaseUrl.length() - 1)
                : gatewayBaseUrl;
        String suffix = value.startsWith("/") ? value : "/" + value;
        return base + suffix;
    }

    private String extractRelativePath(String pathOrUrl) {
        if (!StringUtils.hasText(pathOrUrl)) {
            return "";
        }

        String value = pathOrUrl.trim();
        if (value.startsWith("http://") || value.startsWith("https://")) {
            int start = value.indexOf('/', value.indexOf("://") + 3);
            return start >= 0 ? value.substring(start) : "";
        }
        return value;
    }

    private String normalizePath(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String normalized = value.trim().replaceAll("/{2,}", "/");
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String buildKey(String method, String path) {
        return method + ":" + path;
    }

    private <T> Iterable<T> iterable(java.util.Iterator<T> iterator) {
        return () -> iterator;
    }

    private record ApiDocTarget(String name, String url) {
    }

    public record DiscoveredApiEndpoint(String source, String method, String path) {
    }
}
