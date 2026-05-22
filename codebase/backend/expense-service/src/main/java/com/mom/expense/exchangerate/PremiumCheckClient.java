package com.mom.expense.exchangerate;

import com.mom.common.context.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class PremiumCheckClient {

    private final RestTemplate internalRestTemplate;
    private final String accountServiceUrl;

    public PremiumCheckClient(
            RestTemplate internalRestTemplate,
            @Value("${account-service.url}") String accountServiceUrl
    ) {
        this.internalRestTemplate = internalRestTemplate;
        this.accountServiceUrl = accountServiceUrl;
    }

    /**
     * Kiểm tra xem family có được phép dùng feature hay không.
     * Gọi nội bộ đến account-service, pass-through UserContext headers.
     */
    public boolean isFeatureEnabled(Long familyId, String featureKey) {
        if (Boolean.TRUE.equals(UserContext.isAdmin())) {
            return true;
        }

        String url = accountServiceUrl + "/api/families/" + familyId + "/features/resolved";
        HttpHeaders headers = buildContextHeaders();

        try {
            ResponseEntity<Map<String, Object>> response = internalRestTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<>() {}
            );

            if (response.getBody() == null) {
                return false;
            }

            // ApiResponse wraps data in "data" field
            Object data = response.getBody().get("data");
            if (!(data instanceof List<?> items)) {
                return false;
            }

            return items.stream()
                    .filter(item -> item instanceof Map<?, ?>)
                    .map(item -> (Map<?, ?>) item)
                    .anyMatch(item -> featureKey.equals(item.get("featureKey"))
                            && Boolean.TRUE.equals(item.get("enabled")));
        } catch (Exception e) {
            log.error("Failed to check premium feature '{}' for familyId={}: {}", featureKey, familyId, e.getMessage());
            return false;
        }
    }

    public void requireFeature(Long familyId, String featureKey) {
        if (!isFeatureEnabled(familyId, featureKey)) {
            throw new AccessDeniedException("PREMIUM_REQUIRED:" + featureKey);
        }
    }

    private HttpHeaders buildContextHeaders() {
        HttpHeaders headers = new HttpHeaders();
        Long userId = UserContext.getUserId();
        if (userId != null) {
            headers.set("X-User-Id", userId.toString());
        }
        List<Long> familyIds = UserContext.getFamilyIds();
        if (familyIds != null && !familyIds.isEmpty()) {
            headers.set("X-Family-Ids", familyIds.stream()
                    .map(Object::toString)
                    .reduce((a, b) -> a + "," + b)
                    .orElse(""));
        }
        Boolean isAdmin = UserContext.isAdmin();
        headers.set("X-User-Admin", String.valueOf(Boolean.TRUE.equals(isAdmin)));
        return headers;
    }
}
