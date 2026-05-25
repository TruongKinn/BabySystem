package vn.agent.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import vn.agent.exception.UnauthorizedException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class GithubAuthClient {

    private final WebClient.Builder webClientBuilder;
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE = new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_MAP_TYPE = new ParameterizedTypeReference<>() {};
    private static final String USER_AGENT = "BabySystem-OAuth";

    @Value("${oauth2.github.client-id:}")
    private String clientId;

    @Value("${oauth2.github.client-secret:}")
    private String clientSecret;

    public Map<String, Object> fetchUserInfo(String code) {
        if (code == null || code.isBlank()) {
            throw new UnauthorizedException("GitHub authorization code must not be blank");
        }
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw new UnauthorizedException("GitHub OAuth is not configured on the server");
        }

        WebClient webClient = webClientBuilder.build();

        // Step 1: Exchange authorization code for GitHub access token
        Map<String, Object> tokenBody = new HashMap<>();
        tokenBody.put("client_id", clientId);
        tokenBody.put("client_secret", clientSecret);
        tokenBody.put("code", code);

        Map<String, Object> tokenResponse;
        try {
            tokenResponse = webClient.post()
                    .uri("https://github.com/login/oauth/access_token")
                    .header("Accept", MediaType.APPLICATION_JSON_VALUE)
                    .header("User-Agent", USER_AGENT)
                    .bodyValue(tokenBody)
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();
        } catch (Exception e) {
            log.error("Failed to exchange GitHub authorization code: {}", e.getMessage());
            throw new UnauthorizedException("Failed to exchange GitHub code: " + e.getMessage());
        }

        if (tokenResponse == null) {
            throw new UnauthorizedException("Empty response from GitHub token endpoint");
        }
        if (tokenResponse.containsKey("error")) {
            String errorDesc = tokenResponse.containsKey("error_description")
                    ? String.valueOf(tokenResponse.get("error_description"))
                    : String.valueOf(tokenResponse.get("error"));
            log.warn("GitHub token exchange failed: {}", errorDesc);
            throw new UnauthorizedException("GitHub authorization failed: " + errorDesc);
        }

        Object accessTokenObj = tokenResponse.get("access_token");
        if (accessTokenObj == null) {
            throw new UnauthorizedException("GitHub access token not found in response");
        }
        String accessToken = String.valueOf(accessTokenObj);

        // Step 2: Fetch GitHub user profile
        Map<String, Object> userProfile;
        try {
            userProfile = webClient.get()
                    .uri("https://api.github.com/user")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(MAP_TYPE)
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch GitHub user profile: {}", e.getMessage());
            throw new UnauthorizedException("Failed to fetch GitHub user profile: " + e.getMessage());
        }

        if (userProfile == null) {
            throw new UnauthorizedException("GitHub user profile is empty");
        }

        // Step 3: Fetch verified primary email if profile email is null/private
        if (userProfile.get("email") == null) {
            try {
                List<Map<String, Object>> emails = webClient.get()
                        .uri("https://api.github.com/user/emails")
                        .header("Authorization", "Bearer " + accessToken)
                        .header("User-Agent", USER_AGENT)
                        .header("Accept", "application/vnd.github+json")
                        .retrieve()
                        .bodyToMono(LIST_MAP_TYPE)
                        .block();

                if (emails != null) {
                    for (Map<String, Object> emailEntry : emails) {
                        if (Boolean.TRUE.equals(emailEntry.get("primary"))
                                && Boolean.TRUE.equals(emailEntry.get("verified"))) {
                            userProfile.put("email", emailEntry.get("email"));
                            log.debug("Using primary verified GitHub email from /user/emails endpoint");
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Could not fetch private GitHub emails, will use fallback: {}", e.getMessage());
            }
        }

        return userProfile;
    }
}
