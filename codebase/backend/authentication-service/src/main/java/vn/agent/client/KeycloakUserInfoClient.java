package vn.agent.client;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import vn.agent.exception.UnauthorizedException;

import java.time.Duration;
import java.util.Map;
import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
@Slf4j
public class KeycloakUserInfoClient {

    private static final ParameterizedTypeReference<Map<String, Object>> USER_INFO_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final WebClient keycloakWebClient;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final RetryRegistry retryRegistry;

    @Value("${spring.keycloak.url}")
    private String keycloakUrl;

    @Value("${keycloak.client.response-timeout:5s}")
    private Duration responseTimeout;

    public Map<String, Object> fetchUserInfo(String keycloakToken) {
        String userInfoUrl = keycloakUrl + "/realms/micro-services/protocol/openid-connect/userinfo";
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker("keycloakUserInfo");
        Retry retry = retryRegistry.retry("keycloakUserInfo");

        Supplier<Map<String, Object>> supplier = () -> keycloakWebClient.get()
                .uri(userInfoUrl)
                .header("Authorization", "Bearer " + keycloakToken)
                .retrieve()
                .bodyToMono(USER_INFO_TYPE)
                .timeout(responseTimeout)
                .block();

        Supplier<Map<String, Object>> guardedSupplier =
                CircuitBreaker.decorateSupplier(circuitBreaker, Retry.decorateSupplier(retry, supplier));

        try {
            return guardedSupplier.get();
        } catch (CallNotPermittedException exception) {
            log.warn("Circuit breaker opened for Keycloak userinfo");
            throw new UnauthorizedException("Keycloak is temporarily unavailable. Please retry later.");
        } catch (Exception exception) {
            throw new UnauthorizedException("Invalid Keycloak token: " + exception.getMessage());
        }
    }
}
