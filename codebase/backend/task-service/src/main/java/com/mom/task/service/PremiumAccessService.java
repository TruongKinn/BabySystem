package com.mom.task.service;

import com.mom.common.context.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PremiumAccessService {

    private final RestClient.Builder restClientBuilder;

    @Value("${ACCOUNT_SERVICE_URI:http://localhost:8082}")
    private String accountServiceUri;

    public void requireFeature(Long familyId, String featureKey) {
        if (!isFeatureEnabled(familyId, featureKey)) {
            throw new AccessDeniedException("PREMIUM_REQUIRED:" + featureKey);
        }
    }

    public boolean isFeatureEnabled(Long familyId, String featureKey) {
        try {
            RestClient.RequestHeadersSpec<?> request = restClientBuilder.build()
                    .get()
                    .uri(accountServiceUri + "/api/families/{id}/features/resolved", familyId);

            Long userId = UserContext.getUserId();
            if (userId != null) {
                request = request.header("X-User-Id", String.valueOf(userId));
            }

            List<Long> familyIds = UserContext.getFamilyIds();
            if (familyIds != null && !familyIds.isEmpty()) {
                String familyIdsHeader = familyIds.stream()
                        .map(String::valueOf)
                        .reduce((left, right) -> left + "," + right)
                        .orElse("");
                if (StringUtils.hasText(familyIdsHeader)) {
                    request = request.header("X-Family-Ids", familyIdsHeader);
                }
            }

            request = request.header("X-User-Admin", String.valueOf(UserContext.isAdmin()));

            ResolvedFeatureEnvelope response = request.retrieve().body(ResolvedFeatureEnvelope.class);
            if (response == null || response.data() == null) {
                return false;
            }

            return response.data().stream()
                    .anyMatch(item -> featureKey.equals(item.featureKey()) && item.enabled());
        } catch (Exception ex) {
            log.warn("Failed to resolve premium access for familyId={} featureKey={}: {}", familyId, featureKey, ex.getMessage());
            return false;
        }
    }

    private record ResolvedFeatureEnvelope(
            boolean success,
            String message,
            List<ResolvedFeatureItem> data
    ) {
    }

    private record ResolvedFeatureItem(
            String featureKey,
            boolean enabled,
            String sourceStatus,
            OffsetDateTime expiresAt
    ) {
    }
}
