package vn.logistic.apigateway.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import vn.logistic.apigateway.error.GatewayErrorResponseFactory;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ApiPermissionFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATH_PREFIXES = List.of(
            "/auth/access-token",
            "/auth/refresh-token",
            "/auth/exchange-keycloak-token",
            "/auth/captcha",
            "/actuator",
            "/v3/api-docs",
            "/swagger-ui",
            "/gateway/fallback"
    );

    private final WebClient.Builder webClientBuilder;
    private final GatewayErrorResponseFactory errorResponseFactory;
    private final ObjectMapper objectMapper;
    private final AntPathMatcher antPathMatcher = new AntPathMatcher();

    @Value("${AUTH_SERVICE_URI:http://localhost:8081}")
    private String authServiceUri;

    @Value("${COMMON_SERVICE_URI:http://localhost:8099}")
    private String commonServiceUri;

    @Value("${jwt.accessKey:c2VjcmV0QGtleS5hcGlfaGFzX2JlZW5fZGVzaWduZWRfYnlfVGF5TFE=}")
    private String accessKey;

    @Value("${gateway.authorization.enabled:true}")
    private boolean authorizationEnabled;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        if (!authorizationEnabled || shouldSkip(exchange)) {
            return chain.filter(exchange);
        }

        final String requestPath = exchange.getRequest().getPath().value();
        final String requestMethod = exchange.getRequest().getMethod() != null
                ? exchange.getRequest().getMethod().name()
                : "";

        String token = extractBearerToken(exchange.getRequest().getHeaders());
        if (StringUtils.hasText(token)) {
            return authorizeByBearer(requestMethod, requestPath, token)
                    .flatMap(decision -> {
                        if (decision.allowed()) {
                            log.debug("Gateway authTypeResolved={} path={} method={}", decision.authTypeResolved(), requestPath, requestMethod);
                            return chain.filter(exchange);
                        }

                        HttpStatus status = decision.status() != null ? decision.status() : HttpStatus.UNAUTHORIZED;
                        String message = StringUtils.hasText(decision.message())
                                ? decision.message()
                                : "Invalid or expired access token";
                        return writeError(exchange, status, message);
                    })
                    .onErrorResume(ex -> {
                        log.error("Bearer authorization check failed: {}", ex.getMessage(), ex);
                        return writeError(exchange, HttpStatus.UNAUTHORIZED, "Invalid or expired access token");
                    });
        }

        return authorizeByApiKey(exchange)
                .flatMap(apiKeyDecision -> {
                    if (apiKeyDecision.allowed()) {
                        log.debug("Gateway authTypeResolved={} path={} method={}", apiKeyDecision.authTypeResolved(), requestPath, requestMethod);
                        return chain.filter(exchange);
                    }
                    HttpStatus status = apiKeyDecision.status() != null ? apiKeyDecision.status() : HttpStatus.FORBIDDEN;
                    String message = StringUtils.hasText(apiKeyDecision.message())
                            ? apiKeyDecision.message()
                            : "Forbidden by API key policy";
                    return writeError(exchange, status, message);
                })
                .onErrorResume(ex -> {
                    log.error("API key authorization failed: {}", ex.getMessage(), ex);
                    return writeError(exchange, HttpStatus.FORBIDDEN, "Forbidden by API key policy");
                });
    }

    private Mono<AuthDecision> authorizeByBearer(String requestMethod, String requestPath, String token) {
        Long userId;
        try {
            userId = extractUserId(token);
        } catch (Exception ex) {
            log.warn("Reject request due to invalid access token: {}", ex.getMessage());
            return Mono.just(AuthDecision.rejected(HttpStatus.UNAUTHORIZED, "Invalid or expired access token"));
        }

        return loadUserAccess(userId, token)
                .map(access -> {
                    if (access == null) {
                        return AuthDecision.rejected(HttpStatus.FORBIDDEN, "Unable to resolve user access policy");
                    }
                    if (Boolean.TRUE.equals(access.admin())) {
                        return AuthDecision.allowed("BEARER");
                    }
                    if (isAllowed(access, requestMethod, requestPath)) {
                        return AuthDecision.allowed("BEARER");
                    }
                    return AuthDecision.rejected(HttpStatus.FORBIDDEN, "Forbidden by API permission policy");
                })
                .onErrorResume(ex -> {
                    log.error("Bearer authorization check failed: {}", ex.getMessage(), ex);
                    return Mono.just(AuthDecision.rejected(HttpStatus.FORBIDDEN, "Forbidden by API permission policy"));
                });
    }

    private Mono<AuthDecision> authorizeByApiKey(ServerWebExchange exchange) {
        ApiKeyValidationRequest payload = buildApiKeyValidationRequest(exchange);
        if ((payload.headers() == null || payload.headers().isEmpty())
                && (payload.queryParams() == null || payload.queryParams().isEmpty())) {
            return Mono.just(AuthDecision.rejected(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header"));
        }

        return webClientBuilder.build()
                .post()
                .uri(commonServiceUri + "/common/api/v1/expose/inbound/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(ApiKeyValidationResponse.class)
                .map(response -> {
                    if (response != null && response.allowed()) {
                        return AuthDecision.allowed(
                                StringUtils.hasText(response.authTypeResolved()) ? response.authTypeResolved() : "API_KEY");
                    }
                    String reason = response != null && StringUtils.hasText(response.reason())
                            ? response.reason()
                            : "Forbidden by API key policy";
                    return AuthDecision.rejected(HttpStatus.FORBIDDEN, reason);
                })
                .onErrorResume(ex -> {
                    log.warn("API key validation call failed: {}", ex.getMessage());
                    return Mono.just(AuthDecision.rejected(HttpStatus.FORBIDDEN, "Forbidden by API key policy"));
                });
    }

    private ApiKeyValidationRequest buildApiKeyValidationRequest(ServerWebExchange exchange) {
        Map<String, String> headers = new HashMap<>();
        exchange.getRequest().getHeaders().forEach((key, values) -> {
            if (StringUtils.hasText(key) && values != null && !values.isEmpty()) {
                headers.put(key, values.get(0));
            }
        });

        Map<String, String> queryParams = new HashMap<>();
        MultiValueMap<String, String> sourceQuery = exchange.getRequest().getQueryParams();
        sourceQuery.forEach((key, values) -> {
            if (StringUtils.hasText(key) && values != null && !values.isEmpty()) {
                queryParams.put(key, values.get(0));
            }
        });

        return new ApiKeyValidationRequest(
                exchange.getRequest().getMethod() != null ? exchange.getRequest().getMethod().name() : "",
                exchange.getRequest().getPath().value(),
                headers,
                queryParams
        );
    }

    private record ApiKeyValidationRequest(
            String method,
            String path,
            Map<String, String> headers,
            Map<String, String> queryParams) {
    }

    private record ApiKeyValidationResponse(
            boolean allowed,
            String apiCode,
            String authTypeResolved,
            String reason) {
    }

    private record AuthDecision(boolean allowed, String authTypeResolved, HttpStatus status, String message) {
        private static AuthDecision allowed(String authTypeResolved) {
            return new AuthDecision(true, authTypeResolved, null, null);
        }

        private static AuthDecision rejected(HttpStatus status, String message) {
            return new AuthDecision(false, null, status, message);
        }
    }

    private boolean shouldSkip(ServerWebExchange exchange) {
        if (HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod())) {
            return true;
        }
        String path = exchange.getRequest().getPath().value();
        if (!StringUtils.hasText(path)) {
            return true;
        }
        if (path.startsWith("/notification/ws/")) {
            return true;
        }
        return PUBLIC_PATH_PREFIXES.stream().anyMatch(path::startsWith);
    }

    private String extractBearerToken(HttpHeaders headers) {
        String authorization = headers.getFirst(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authorization)) {
            return null;
        }
        if (!authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7).trim();
    }

    private Long extractUserId(String token) {
        Key key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(accessKey));
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
        Number userIdValue = claims.get("userId", Number.class);
        if (userIdValue == null) {
            throw new IllegalArgumentException("userId claim is missing");
        }
        return userIdValue.longValue();
    }

    private Mono<UserAccessResponse> loadUserAccess(Long userId, String token) {
        return webClientBuilder.build()
                .get()
                .uri(authServiceUri + "/roles/users/{userId}/access", userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(UserAccessResponse.class);
    }

    private boolean isAllowed(UserAccessResponse access, String requestMethod, String requestPath) {
        if (access.apiPermissions() == null || access.apiPermissions().isEmpty()) {
            return false;
        }
        return access.apiPermissions().stream()
                .filter(item -> item != null && StringUtils.hasText(item.method()) && StringUtils.hasText(item.path()))
                .anyMatch(item ->
                        requestMethod.equalsIgnoreCase(item.method())
                                && matchPathPattern(item.path(), requestPath));
    }

    private boolean matchPathPattern(String pattern, String actualPath) {
        String antPattern = pattern.replaceAll("\\{[^/]+}", "*");
        return antPathMatcher.match(antPattern, actualPath);
    }

    private Mono<Void> writeError(ServerWebExchange exchange, HttpStatus status, String message) {
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> body = errorResponseFactory.build(
                status,
                message,
                exchange.getRequest().getPath().value(),
                exchange.getRequest().getId(),
                "api-gateway");
        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException ex) {
            jsonBody = "{\"status\":" + status.value() + ",\"message\":\"" + message + "\"}";
        }
        DataBuffer buffer = exchange.getResponse().bufferFactory()
                .wrap(jsonBody.getBytes(StandardCharsets.UTF_8));
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 5;
    }

    private record UserAccessResponse(Boolean admin, List<ApiPermissionRule> apiPermissions) {
    }

    private record ApiPermissionRule(String method, String path) {
    }
}
