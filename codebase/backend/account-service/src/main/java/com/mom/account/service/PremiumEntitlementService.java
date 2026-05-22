package com.mom.account.service;

import com.mom.account.controller.dto.FamilyFeatureAuditLogResponse;
import com.mom.account.controller.dto.FamilyFeatureEntitlementResponse;
import com.mom.account.controller.dto.PremiumFeatureResponse;
import com.mom.account.controller.dto.ResolvedFeatureAccessResponse;
import com.mom.account.controller.dto.UpdateFamilyEntitlementsRequest;
import com.mom.account.controller.dto.UpsertFamilyFeatureEntitlementRequest;
import com.mom.account.domain.EntitlementAuditLogEntity;
import com.mom.account.domain.FamilyFeatureEntitlementEntity;
import com.mom.account.domain.PremiumFeatureEntity;
import com.mom.account.domain.PremiumFeatureStatus;
import com.mom.account.repository.EntitlementAuditLogRepository;
import com.mom.account.repository.FamilyFeatureEntitlementRepository;
import com.mom.account.repository.FamilyRepository;
import com.mom.account.repository.PremiumFeatureRepository;
import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PremiumEntitlementService {

    private static final String EFFECTIVE_REASON_ALLOW = "ALLOW";
    private static final String EFFECTIVE_REASON_DENY = "DENY";
    private static final String EFFECTIVE_REASON_INHERIT = "INHERIT";
    private static final String EFFECTIVE_REASON_EXPIRED = "EXPIRED";
    private static final String EFFECTIVE_REASON_FEATURE_DISABLED = "FEATURE_DISABLED";

    private final FamilyRepository familyRepository;
    private final PremiumFeatureRepository premiumFeatureRepository;
    private final FamilyFeatureEntitlementRepository familyFeatureEntitlementRepository;
    private final EntitlementAuditLogRepository entitlementAuditLogRepository;

    public List<PremiumFeatureResponse> getPremiumFeaturesForAdmin() {
        ensureRequestAuthenticated();
        return premiumFeatureRepository.findAllByOrderByKeyAsc().stream()
                .map(feature -> new PremiumFeatureResponse(
                        feature.getKey(),
                        feature.getName(),
                        feature.getDescription(),
                        feature.isActive()
                ))
                .toList();
    }

    public List<FamilyFeatureEntitlementResponse> getFamilyEntitlementsForAdmin(Long familyId) {
        ensureRequestAuthenticated();
        ensureFamilyExists(familyId);
        return buildFamilyEntitlementResponses(familyId);
    }

    @Transactional
    public List<FamilyFeatureEntitlementResponse> updateFamilyEntitlementsForAdmin(
            Long familyId,
            UpdateFamilyEntitlementsRequest request
    ) {
        ensureRequestAuthenticated();
        ensureFamilyExists(familyId);

        Set<String> duplicatedKeys = findDuplicateFeatureKeys(request.entitlements());
        if (!duplicatedKeys.isEmpty()) {
            throw new IllegalArgumentException("Duplicated feature keys in request: " + String.join(", ", duplicatedKeys));
        }

        Map<String, PremiumFeatureEntity> featureByKey = premiumFeatureRepository.findAllByOrderByKeyAsc().stream()
                .collect(Collectors.toMap(PremiumFeatureEntity::getKey, feature -> feature));

        List<String> unknownFeatureKeys = request.entitlements().stream()
                .map(item -> normalizeFeatureKey(item.featureKey()))
                .filter(key -> !featureByKey.containsKey(key))
                .sorted()
                .toList();
        if (!unknownFeatureKeys.isEmpty()) {
            throw new IllegalArgumentException("Unknown premium feature keys: " + String.join(", ", unknownFeatureKeys));
        }

        Map<String, FamilyFeatureEntitlementEntity> existingByKey = familyFeatureEntitlementRepository.findByFamilyId(familyId)
                .stream()
                .collect(Collectors.toMap(FamilyFeatureEntitlementEntity::getFeatureKey, entity -> entity));

        Long changedBy = UserContext.getUserId();
        OffsetDateTime now = OffsetDateTime.now();

        for (UpsertFamilyFeatureEntitlementRequest item : request.entitlements()) {
            String featureKey = normalizeFeatureKey(item.featureKey());
            FamilyFeatureEntitlementEntity current = existingByKey.get(featureKey);

            PremiumFeatureStatus oldStatus = current != null ? current.getStatus() : null;
            OffsetDateTime oldExpiresAt = current != null ? current.getExpiresAt() : null;
            String oldReason = current != null ? current.getReason() : null;

            FamilyFeatureEntitlementEntity target = current != null ? current : new FamilyFeatureEntitlementEntity();
            if (current == null) {
                target.setFamilyId(familyId);
                target.setFeatureKey(featureKey);
                target.setCreatedAt(now);
            }

            target.setStatus(item.status());
            target.setExpiresAt(normalizeExpiresAt(item.status(), item.expiresAt()));
            target.setReason(trimToNull(item.reason()));
            target.setUpdatedByUserId(changedBy);
            target.setUpdatedAt(now);
            familyFeatureEntitlementRepository.save(target);

            boolean changed = oldStatus != target.getStatus()
                    || !Objects.equals(oldExpiresAt, target.getExpiresAt())
                    || !Objects.equals(oldReason, target.getReason());
            if (changed) {
                EntitlementAuditLogEntity log = new EntitlementAuditLogEntity();
                log.setFamilyId(familyId);
                log.setFeatureKey(target.getFeatureKey());
                log.setOldStatus(oldStatus);
                log.setNewStatus(target.getStatus());
                log.setOldExpiresAt(oldExpiresAt);
                log.setNewExpiresAt(target.getExpiresAt());
                log.setReason(target.getReason());
                log.setChangedByUserId(changedBy);
                log.setChangedAt(now);
                entitlementAuditLogRepository.save(log);
            }
        }

        return buildFamilyEntitlementResponses(familyId);
    }

    public List<FamilyFeatureAuditLogResponse> getFamilyEntitlementAuditForAdmin(Long familyId) {
        ensureRequestAuthenticated();
        ensureFamilyExists(familyId);
        return entitlementAuditLogRepository.findByFamilyIdOrderByChangedAtDesc(familyId).stream()
                .map(log -> new FamilyFeatureAuditLogResponse(
                        log.getId(),
                        log.getFeatureKey(),
                        log.getOldStatus(),
                        log.getNewStatus(),
                        log.getOldExpiresAt(),
                        log.getNewExpiresAt(),
                        log.getReason(),
                        log.getChangedByUserId(),
                        log.getChangedAt()
                ))
                .toList();
    }

    public List<ResolvedFeatureAccessResponse> resolveFamilyFeatures(Long familyId) {
        validateFamilyAccessIfContextPresent(familyId);
        ensureFamilyExists(familyId);

        Map<String, FamilyFeatureEntitlementEntity> entitlementByKey = familyFeatureEntitlementRepository.findByFamilyId(familyId)
                .stream()
                .collect(Collectors.toMap(FamilyFeatureEntitlementEntity::getFeatureKey, entity -> entity));

        OffsetDateTime now = OffsetDateTime.now();
        return premiumFeatureRepository.findAllByOrderByKeyAsc().stream()
                .map(feature -> {
                    FamilyFeatureEntitlementEntity entitlement = entitlementByKey.get(feature.getKey());
                    ResolvedDecision decision = resolveDecision(feature, entitlement, now);
                    return new ResolvedFeatureAccessResponse(
                            feature.getKey(),
                            decision.enabled(),
                            decision.reason(),
                            entitlement != null ? entitlement.getExpiresAt() : null
                    );
                })
                .toList();
    }

    public boolean isFeatureEnabled(Long familyId, String featureKey) {
        String normalizedKey = normalizeFeatureKey(featureKey);
        if (normalizedKey.isEmpty()) {
            return false;
        }

        return resolveFamilyFeatures(familyId).stream()
                .anyMatch(item -> normalizedKey.equals(item.featureKey()) && item.enabled());
    }

    public void requireFeature(Long familyId, String featureKey) {
        if (Boolean.TRUE.equals(UserContext.isAdmin())) {
            return;
        }
        String normalizedKey = normalizeFeatureKey(featureKey);
        if (normalizedKey.isEmpty() || !isFeatureEnabled(familyId, normalizedKey)) {
            throw new AccessDeniedException("PREMIUM_REQUIRED:" + normalizedKey);
        }
    }

    private List<FamilyFeatureEntitlementResponse> buildFamilyEntitlementResponses(Long familyId) {
        List<PremiumFeatureEntity> features = premiumFeatureRepository.findAllByOrderByKeyAsc();
        Map<String, FamilyFeatureEntitlementEntity> entitlementByKey = new HashMap<>();
        for (FamilyFeatureEntitlementEntity entitlement : familyFeatureEntitlementRepository.findByFamilyId(familyId)) {
            entitlementByKey.put(entitlement.getFeatureKey(), entitlement);
        }

        OffsetDateTime now = OffsetDateTime.now();
        return features.stream()
                .map(feature -> {
                    FamilyFeatureEntitlementEntity entitlement = entitlementByKey.get(feature.getKey());
                    ResolvedDecision decision = resolveDecision(feature, entitlement, now);
                    return new FamilyFeatureEntitlementResponse(
                            feature.getKey(),
                            feature.getName(),
                            feature.getDescription(),
                            entitlement != null ? entitlement.getStatus() : PremiumFeatureStatus.INHERIT,
                            entitlement != null ? entitlement.getExpiresAt() : null,
                            entitlement != null ? entitlement.getReason() : null,
                            entitlement != null ? entitlement.getUpdatedByUserId() : null,
                            entitlement != null ? entitlement.getUpdatedAt() : null,
                            decision.enabled(),
                            decision.reason()
                    );
                })
                .toList();
    }

    private ResolvedDecision resolveDecision(
            PremiumFeatureEntity feature,
            FamilyFeatureEntitlementEntity entitlement,
            OffsetDateTime now
    ) {
        if (!feature.isActive()) {
            return new ResolvedDecision(false, EFFECTIVE_REASON_FEATURE_DISABLED);
        }

        if (entitlement == null || entitlement.getStatus() == PremiumFeatureStatus.INHERIT) {
            return new ResolvedDecision(false, EFFECTIVE_REASON_INHERIT);
        }
        if (entitlement.getStatus() == PremiumFeatureStatus.DENY) {
            return new ResolvedDecision(false, EFFECTIVE_REASON_DENY);
        }
        if (entitlement.getStatus() == PremiumFeatureStatus.ALLOW) {
            if (entitlement.getExpiresAt() != null && !entitlement.getExpiresAt().isAfter(now)) {
                return new ResolvedDecision(false, EFFECTIVE_REASON_EXPIRED);
            }
            return new ResolvedDecision(true, EFFECTIVE_REASON_ALLOW);
        }
        return new ResolvedDecision(false, EFFECTIVE_REASON_INHERIT);
    }

    private OffsetDateTime normalizeExpiresAt(PremiumFeatureStatus status, OffsetDateTime expiresAt) {
        if (status != PremiumFeatureStatus.ALLOW) {
            return null;
        }
        return expiresAt;
    }

    private Set<String> findDuplicateFeatureKeys(List<UpsertFamilyFeatureEntitlementRequest> items) {
        Set<String> seen = new HashSet<>();
        Set<String> duplicated = new HashSet<>();
        for (UpsertFamilyFeatureEntitlementRequest item : items) {
            String normalized = normalizeFeatureKey(item.featureKey());
            if (!seen.add(normalized)) {
                duplicated.add(normalized);
            }
        }
        return duplicated;
    }

    private String normalizeFeatureKey(String key) {
        return key == null ? "" : key.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void ensureFamilyExists(Long familyId) {
        familyRepository.findById(familyId).orElseThrow(() -> new ResourceNotFoundException("Family not found"));
    }

    private void ensureRequestAuthenticated() {
        if (UserContext.getUserId() == null) {
            throw new AccessDeniedException("Access denied: missing user context");
        }
    }

    private void validateFamilyAccessIfContextPresent(Long familyId) {
        if (familyId == null) {
            throw new IllegalArgumentException("familyId must not be null");
        }
        if (Boolean.TRUE.equals(UserContext.isAdmin())) {
            return;
        }
        List<Long> allowedFamilyIds = UserContext.getFamilyIds();
        if (allowedFamilyIds == null || allowedFamilyIds.isEmpty()) {
            return;
        }
        if (!allowedFamilyIds.contains(familyId)) {
            throw new AccessDeniedException("Access denied for familyId: " + familyId);
        }
    }

    private record ResolvedDecision(boolean enabled, String reason) {
    }
}
