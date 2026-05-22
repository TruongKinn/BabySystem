package com.mom.account.service;

import com.mom.account.controller.dto.ClaimFamilyQuestRewardRequest;
import com.mom.account.controller.dto.FamilyQuestPointGrantLogResponse;
import com.mom.account.controller.dto.FamilyQuestRewardCatalogItemResponse;
import com.mom.account.controller.dto.FamilyQuestRewardRedemptionResponse;
import com.mom.account.controller.dto.FamilyQuestStateResponse;
import com.mom.account.controller.dto.GrantFamilyQuestPointsRequest;
import com.mom.account.controller.dto.GrantFamilyQuestPointsResponse;
import com.mom.account.controller.dto.RedeemFamilyQuestRewardRequest;
import com.mom.account.controller.dto.RedeemFamilyQuestRewardResponse;
import com.mom.account.domain.FamilyQuestPointGrantLogEntity;
import com.mom.account.domain.FamilyQuestRewardRedemptionEntity;
import com.mom.account.domain.FamilyQuestStateEntity;
import com.mom.account.repository.FamilyQuestPointGrantLogRepository;
import com.mom.account.repository.FamilyQuestRewardRedemptionRepository;
import com.mom.account.repository.FamilyQuestStateRepository;
import com.mom.account.repository.FamilyRepository;
import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FamilyQuestService {

    private static final int DAILY_REWARD_POINTS = 100;
    private static final Map<String, RewardDefinition> REWARD_CATALOG = buildRewardCatalog();

    private final FamilyRepository familyRepository;
    private final FamilyQuestStateRepository familyQuestStateRepository;
    private final FamilyQuestPointGrantLogRepository familyQuestPointGrantLogRepository;
    private final FamilyQuestRewardRedemptionRepository familyQuestRewardRedemptionRepository;

    public FamilyQuestStateResponse getFamilyQuestState(Long familyId) {
        validateFamilyAccessIfContextPresent(familyId);
        ensureFamilyExists(familyId);

        LocalDate today = LocalDate.now();
        FamilyQuestStateEntity state = familyQuestStateRepository.findById(familyId)
                .orElseGet(() -> defaultState(familyId));
        return toResponse(state, today);
    }

    public FamilyQuestStateResponse getFamilyQuestStateForAdmin(Long familyId) {
        ensureRequestAuthenticated();
        ensureFamilyExists(familyId);

        LocalDate today = LocalDate.now();
        FamilyQuestStateEntity state = familyQuestStateRepository.findById(familyId)
                .orElseGet(() -> defaultState(familyId));
        return toResponse(state, today);
    }

    @Transactional
    public FamilyQuestStateResponse claimDailyReward(Long familyId, ClaimFamilyQuestRewardRequest request) {
        validateFamilyAccessIfContextPresent(familyId);
        ensureFamilyExists(familyId);

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        int rewardPoints = DAILY_REWARD_POINTS;

        FamilyQuestStateEntity state = familyQuestStateRepository.findById(familyId)
                .orElseGet(() -> {
                    FamilyQuestStateEntity created = defaultState(familyId);
                    created.setCreatedAt(OffsetDateTime.now());
                    return created;
                });

        if (today.equals(state.getLastClaimDate())) {
            throw new IllegalArgumentException("Daily quest reward already claimed for today");
        }

        int currentStreak = safeNonNegative(state.getStreakDays());
        int baseStreak = yesterday.equals(state.getLastClaimDate()) ? currentStreak : 0;
        int nextStreak = baseStreak + 1;

        int currentTotalPoints = safeNonNegative(state.getTotalPoints());
        int nextTotalPoints = sumPoints(currentTotalPoints, rewardPoints);

        OffsetDateTime now = OffsetDateTime.now();
        state.setLastClaimDate(today);
        state.setStreakDays(nextStreak);
        state.setTotalPoints(nextTotalPoints);
        state.setUpdatedByUserId(UserContext.getUserId());
        state.setUpdatedAt(now);

        FamilyQuestStateEntity saved = familyQuestStateRepository.save(state);
        return toResponse(saved, today);
    }

    public List<FamilyQuestRewardCatalogItemResponse> getRewardCatalog(Long familyId) {
        validateFamilyAccessIfContextPresent(familyId);
        ensureFamilyExists(familyId);
        return REWARD_CATALOG.values().stream()
                .map(item -> new FamilyQuestRewardCatalogItemResponse(
                        item.key(),
                        item.name(),
                        item.description(),
                        item.costPoints()
                ))
                .toList();
    }

    public List<FamilyQuestRewardRedemptionResponse> getRewardRedemptions(Long familyId) {
        validateFamilyAccessIfContextPresent(familyId);
        ensureFamilyExists(familyId);
        return familyQuestRewardRedemptionRepository.findTop20ByFamilyIdOrderByRedeemedAtDesc(familyId).stream()
                .map(item -> new FamilyQuestRewardRedemptionResponse(
                        item.getId(),
                        item.getRewardKey(),
                        item.getRewardName(),
                        safeNonNegative(item.getCostPoints()),
                        item.getRedeemedByUserId(),
                        item.getRedeemedAt()
                ))
                .toList();
    }

    public List<FamilyQuestPointGrantLogResponse> getPointGrantLogsForAdmin(Long familyId) {
        ensureRequestAuthenticated();
        ensureFamilyExists(familyId);
        return familyQuestPointGrantLogRepository.findTop30ByFamilyIdOrderByGrantedAtDesc(familyId).stream()
                .map(this::toPointGrantLogResponse)
                .toList();
    }

    @Transactional
    public GrantFamilyQuestPointsResponse grantPointsForAdmin(Long familyId, GrantFamilyQuestPointsRequest request) {
        ensureRequestAuthenticated();
        ensureFamilyExists(familyId);

        int grantPoints = request.points() == null ? 0 : request.points();
        if (grantPoints <= 0) {
            throw new IllegalArgumentException("points must be greater than 0");
        }

        FamilyQuestStateEntity state = familyQuestStateRepository.findById(familyId)
                .orElseGet(() -> {
                    FamilyQuestStateEntity created = defaultState(familyId);
                    created.setCreatedAt(OffsetDateTime.now());
                    return created;
                });

        OffsetDateTime now = OffsetDateTime.now();
        int currentTotalPoints = safeNonNegative(state.getTotalPoints());
        state.setTotalPoints(sumPoints(currentTotalPoints, grantPoints));
        state.setUpdatedByUserId(UserContext.getUserId());
        state.setUpdatedAt(now);
        FamilyQuestStateEntity savedState = familyQuestStateRepository.save(state);

        FamilyQuestPointGrantLogEntity log = new FamilyQuestPointGrantLogEntity();
        log.setFamilyId(familyId);
        log.setPoints(grantPoints);
        log.setReason(trimToNull(request.reason()));
        log.setGrantedByUserId(UserContext.getUserId());
        log.setGrantedAt(now);
        FamilyQuestPointGrantLogEntity savedLog = familyQuestPointGrantLogRepository.save(log);

        return new GrantFamilyQuestPointsResponse(
                toResponse(savedState, LocalDate.now()),
                toPointGrantLogResponse(savedLog)
        );
    }

    @Transactional
    public RedeemFamilyQuestRewardResponse redeemReward(Long familyId, RedeemFamilyQuestRewardRequest request) {
        validateFamilyAccessIfContextPresent(familyId);
        ensureFamilyExists(familyId);

        RewardDefinition reward = resolveReward(request.rewardKey());
        FamilyQuestStateEntity state = familyQuestStateRepository.findById(familyId)
                .orElseGet(() -> {
                    FamilyQuestStateEntity created = defaultState(familyId);
                    created.setCreatedAt(OffsetDateTime.now());
                    return created;
                });

        int currentPoints = safeNonNegative(state.getTotalPoints());
        if (currentPoints < reward.costPoints()) {
            throw new IllegalArgumentException("Not enough quest points to redeem this reward");
        }

        OffsetDateTime now = OffsetDateTime.now();
        state.setTotalPoints(currentPoints - reward.costPoints());
        state.setUpdatedByUserId(UserContext.getUserId());
        state.setUpdatedAt(now);
        FamilyQuestStateEntity savedState = familyQuestStateRepository.save(state);

        FamilyQuestRewardRedemptionEntity redemption = new FamilyQuestRewardRedemptionEntity();
        redemption.setFamilyId(familyId);
        redemption.setRewardKey(reward.key());
        redemption.setRewardName(reward.name());
        redemption.setCostPoints(reward.costPoints());
        redemption.setRedeemedByUserId(UserContext.getUserId());
        redemption.setRedeemedAt(now);
        FamilyQuestRewardRedemptionEntity savedRedemption = familyQuestRewardRedemptionRepository.save(redemption);

        return new RedeemFamilyQuestRewardResponse(
                toResponse(savedState, LocalDate.now()),
                new FamilyQuestRewardRedemptionResponse(
                        savedRedemption.getId(),
                        savedRedemption.getRewardKey(),
                        savedRedemption.getRewardName(),
                        safeNonNegative(savedRedemption.getCostPoints()),
                        savedRedemption.getRedeemedByUserId(),
                        savedRedemption.getRedeemedAt()
                )
        );
    }

    private FamilyQuestStateEntity defaultState(Long familyId) {
        FamilyQuestStateEntity state = new FamilyQuestStateEntity();
        state.setFamilyId(familyId);
        state.setLastClaimDate(null);
        state.setStreakDays(0);
        state.setTotalPoints(0);
        state.setUpdatedByUserId(null);
        state.setUpdatedAt(OffsetDateTime.now());
        return state;
    }

    private FamilyQuestStateResponse toResponse(FamilyQuestStateEntity state, LocalDate today) {
        LocalDate lastClaimDate = state.getLastClaimDate();
        int streakDays = safeNonNegative(state.getStreakDays());
        int totalPoints = safeNonNegative(state.getTotalPoints());
        return new FamilyQuestStateResponse(
                state.getFamilyId(),
                lastClaimDate,
                streakDays,
                totalPoints,
                today.equals(lastClaimDate)
        );
    }

    private int safeNonNegative(Integer value) {
        if (value == null || value < 0) {
            return 0;
        }
        return value;
    }

    private int sumPoints(int currentPoints, int delta) {
        long next = (long) currentPoints + delta;
        if (next > Integer.MAX_VALUE) {
            return Integer.MAX_VALUE;
        }
        if (next < 0) {
            return 0;
        }
        return (int) next;
    }

    private RewardDefinition resolveReward(String rewardKey) {
        String normalizedKey = rewardKey == null ? "" : rewardKey.trim().toLowerCase();
        RewardDefinition reward = REWARD_CATALOG.get(normalizedKey);
        if (reward == null) {
            String allowed = REWARD_CATALOG.keySet().stream().sorted().collect(Collectors.joining(", "));
            throw new IllegalArgumentException("Unknown rewardKey. Allowed values: " + allowed);
        }
        return reward;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private FamilyQuestPointGrantLogResponse toPointGrantLogResponse(FamilyQuestPointGrantLogEntity item) {
        return new FamilyQuestPointGrantLogResponse(
                item.getId(),
                safeNonNegative(item.getPoints()),
                item.getReason(),
                item.getGrantedByUserId(),
                item.getGrantedAt()
        );
    }

    private void ensureFamilyExists(Long familyId) {
        familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
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

    private void ensureRequestAuthenticated() {
        if (UserContext.getUserId() == null) {
            throw new AccessDeniedException("Access denied: missing user context");
        }
    }

    private static Map<String, RewardDefinition> buildRewardCatalog() {
        Map<String, RewardDefinition> catalog = new LinkedHashMap<>();
        catalog.put("quick_meal_pack", new RewardDefinition(
                "quick_meal_pack",
                "Quick Meal Pack",
                "Unlock one curated quick meal plan suggestion pack for the family.",
                120
        ));
        catalog.put("focus_day_theme", new RewardDefinition(
                "focus_day_theme",
                "Focus Day Theme",
                "Unlock a special Family Quest visual theme for one day.",
                180
        ));
        catalog.put("memory_spotlight", new RewardDefinition(
                "memory_spotlight",
                "Memory Spotlight",
                "Mark one family memory as spotlight and pin it to the top in memory feed.",
                260
        ));
        return Map.copyOf(catalog);
    }

    private record RewardDefinition(
            String key,
            String name,
            String description,
            int costPoints
    ) {
    }
}
