package vn.agent.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import vn.agent.exception.UnauthorizedException;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleAuthClient {

    private final WebClient.Builder webClientBuilder;
    private static final ParameterizedTypeReference<Map<String, Object>> USER_INFO_TYPE = new ParameterizedTypeReference<>() {};

    @Value("${oauth2.google.client-id:}")
    private String expectedClientId;

    public Map<String, Object> fetchUserInfo(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new UnauthorizedException("Google ID token must not be blank");
        }
        try {
            WebClient webClient = webClientBuilder.build();
            Map<String, Object> response = webClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken)
                    .retrieve()
                    .bodyToMono(USER_INFO_TYPE)
                    .block();

            if (response == null) {
                throw new UnauthorizedException("Empty response from Google tokeninfo");
            }
            if (response.containsKey("error")) {
                String errorDesc = response.containsKey("error_description")
                        ? String.valueOf(response.get("error_description"))
                        : String.valueOf(response.get("error"));
                log.warn("Google tokeninfo rejected token: {}", errorDesc);
                throw new UnauthorizedException("Google token is invalid or expired: " + errorDesc);
            }

            // Optionally validate aud (audience) matches our Client ID
            if (!expectedClientId.isBlank()) {
                String aud = response.containsKey("aud") ? String.valueOf(response.get("aud")) : "";
                if (!aud.equals(expectedClientId)) {
                    log.warn("Google token audience mismatch: expected={}, got={}", expectedClientId, aud);
                    throw new UnauthorizedException("Google token audience does not match configured client ID");
                }
            }

            return response;
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify Google ID token: {}", e.getMessage());
            throw new UnauthorizedException("Failed to verify Google token: " + e.getMessage());
        }
    }
}
