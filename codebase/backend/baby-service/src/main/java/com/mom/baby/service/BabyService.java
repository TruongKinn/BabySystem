package com.mom.baby.service;

import com.mom.baby.controller.dto.BabyCareTrendPointResponse;
import com.mom.baby.controller.dto.BabyDailySummaryResponse;
import com.mom.baby.controller.dto.BabyDashboardResponse;
import com.mom.baby.controller.dto.BabyGrowthInsightResponse;
import com.mom.baby.controller.dto.BabyLogResponse;
import com.mom.baby.controller.dto.BabyResponse;
import com.mom.baby.controller.dto.BabyVaccinationInsightResponse;
import com.mom.baby.controller.dto.BatchImportBabiesRequest;
import com.mom.baby.controller.dto.BatchImportResponse;
import com.mom.baby.controller.dto.CreateBabyLogRequest;
import com.mom.baby.controller.dto.CreateBabyRequest;
import com.mom.baby.controller.dto.CreateGrowthRecordRequest;
import com.mom.baby.controller.dto.CreateVaccinationRequest;
import com.mom.baby.controller.dto.GrowthRecordResponse;
import com.mom.baby.controller.dto.UpdateBabyRequest;
import com.mom.baby.controller.dto.VaccinationResponse;
import com.mom.baby.domain.BabyEntity;
import com.mom.baby.domain.BabyLogEntity;
import com.mom.baby.domain.BabyLogType;
import com.mom.baby.domain.GrowthRecordEntity;
import com.mom.baby.domain.VaccinationEntity;
import com.mom.baby.event.BabyEventPublisher;
import com.mom.baby.event.BabyLogCreatedPayload;
import com.mom.baby.forecast.event.BabyForecastEventPublisher;
import com.mom.baby.premium.PremiumFeatures;
import com.mom.baby.repository.BabyLogRepository;
import com.mom.baby.repository.BabyRepository;
import com.mom.baby.repository.GrowthRecordRepository;
import com.mom.baby.repository.VaccinationRepository;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BabyService {

    private static final int MIN_TREND_DAYS = 1;
    private static final int MAX_TREND_DAYS = 30;
    private static final int MIN_RECENT_LOG_LIMIT = 1;
    private static final int MAX_RECENT_LOG_LIMIT = 50;
    private static final int MIN_UPCOMING_VACCINATION_LIMIT = 1;
    private static final int MAX_UPCOMING_VACCINATION_LIMIT = 20;

    private final BabyRepository babyRepository;
    private final BabyLogRepository babyLogRepository;
    private final VaccinationRepository vaccinationRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final BabyEventPublisher babyEventPublisher;
    private final BabyForecastEventPublisher babyForecastEventPublisher;
    private final PremiumAccessService premiumAccessService;

    @Transactional
    public BabyResponse createBaby(CreateBabyRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());

        BabyEntity baby = new BabyEntity();
        baby.setFamilyId(request.familyId());
        baby.setName(request.name().trim());
        baby.setBirthDate(request.birthDate());
        baby.setGender(request.gender());
        baby.setNotes(trimToNull(request.notes()));
        return toBabyResponse(babyRepository.save(baby));
    }

    public List<BabyResponse> getBabies(Long familyId) {
        DataIsolationUtil.validateFamilyAccess(familyId);

        return babyRepository.findByFamilyIdOrderByCreatedAtDesc(familyId).stream()
                .map(this::toBabyResponse)
                .toList();
    }

    public BabyResponse getBaby(Long babyId) {
        return toBabyResponse(getBabyEntity(babyId));
    }

    @Transactional
    public BabyResponse updateBaby(Long babyId, UpdateBabyRequest request) {
        BabyEntity baby = getBabyEntity(babyId);
        if (request.name() != null) {
            baby.setName(request.name().trim());
        }
        if (request.birthDate() != null) {
            baby.setBirthDate(request.birthDate());
        }
        if (request.gender() != null) {
            baby.setGender(request.gender());
        }
        if (request.notes() != null) {
            baby.setNotes(trimToNull(request.notes()));
        }
        return toBabyResponse(babyRepository.save(baby));
    }

    @Transactional
    public void deleteBaby(Long babyId) {
        BabyEntity baby = getBabyEntity(babyId);
        babyRepository.delete(baby);
    }

    @Transactional
    public BabyLogResponse createLog(Long babyId, CreateBabyLogRequest request) {
        BabyEntity baby = getBabyEntity(babyId);
        BabyLogEntity log = new BabyLogEntity();
        log.setBabyId(babyId);
        log.setLogType(request.logType());
        log.setValue(request.value());
        log.setNote(trimToNull(request.note()));
        log.setLoggedAt(resolveLoggedAt(request.loggedAt()));
        BabyLogEntity saved = babyLogRepository.save(log);

        babyEventPublisher.publishBabyLogCreated(new BabyLogCreatedPayload(
                saved.getId(),
                saved.getBabyId(),
                baby.getFamilyId(),
                saved.getLogType(),
                saved.getValue(),
                saved.getLoggedAt()
        ));
        babyForecastEventPublisher.publishActivityRecorded(saved, baby.getFamilyId());
        return toBabyLogResponse(saved);
    }

    public List<BabyLogResponse> getLogs(Long babyId, LocalDate date) {
        getBabyEntity(babyId);
        List<BabyLogEntity> logs = date == null
                ? babyLogRepository.findByBabyIdOrderByLoggedAtDesc(babyId)
                : babyLogRepository.findByBabyIdAndLoggedAtBetweenOrderByLoggedAtDesc(
                babyId,
                date.atStartOfDay().atOffset(ZoneOffset.UTC),
                date.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1)
        );
        return logs.stream().map(this::toBabyLogResponse).toList();
    }

    @Transactional
    public VaccinationResponse createVaccination(Long babyId, CreateVaccinationRequest request) {
        getBabyEntity(babyId);
        VaccinationEntity vaccination = new VaccinationEntity();
        vaccination.setBabyId(babyId);
        vaccination.setVaccineName(request.vaccineName().trim());
        vaccination.setDueDate(request.dueDate());
        vaccination.setCompleted(Boolean.TRUE.equals(request.completed()));
        vaccination.setCompletedAt(vaccination.isCompleted() ? OffsetDateTime.now(ZoneOffset.UTC) : null);
        vaccination.setNotes(trimToNull(request.notes()));
        return toVaccinationResponse(vaccinationRepository.save(vaccination));
    }

    public List<VaccinationResponse> getVaccinations(Long babyId) {
        getBabyEntity(babyId);
        return vaccinationRepository.findByBabyIdOrderByDueDateAsc(babyId).stream()
                .map(this::toVaccinationResponse)
                .toList();
    }

    @Transactional
    public GrowthRecordResponse createGrowthRecord(Long babyId, CreateGrowthRecordRequest request) {
        BabyEntity baby = getBabyEntity(babyId);
        premiumAccessService.requireFeature(baby.getFamilyId(), PremiumFeatures.ADVANCED_GROWTH_TRACKING);

        GrowthRecordEntity record = new GrowthRecordEntity();
        record.setBabyId(babyId);
        record.setMeasuredAt(request.measuredAt());
        record.setWeightKg(request.weightKg());
        record.setHeightCm(request.heightCm());
        record.setHeadCircumferenceCm(request.headCircumferenceCm());
        record.setNotes(trimToNull(request.notes()));
        return toGrowthRecordResponse(growthRecordRepository.save(record));
    }

    public List<GrowthRecordResponse> getGrowthRecords(Long babyId) {
        BabyEntity baby = getBabyEntity(babyId);
        premiumAccessService.requireFeature(baby.getFamilyId(), PremiumFeatures.ADVANCED_GROWTH_TRACKING);

        return growthRecordRepository.findByBabyIdOrderByMeasuredAtDesc(babyId).stream()
                .map(this::toGrowthRecordResponse)
                .toList();
    }

    public BabyDailySummaryResponse getDailySummary(Long babyId, LocalDate date) {
        getBabyEntity(babyId);
        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        return buildDailySummary(babyId, targetDate);
    }

    public BabyDashboardResponse getDashboard(
            Long babyId,
            LocalDate date,
            int trendDays,
            int recentLogLimit,
            int upcomingVaccinationLimit
    ) {
        BabyEntity baby = getBabyEntity(babyId);
        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        boolean growthFeatureEnabled = premiumAccessService.isFeatureEnabled(
                baby.getFamilyId(),
                PremiumFeatures.ADVANCED_GROWTH_TRACKING
        );

        int normalizedTrendDays = clamp(trendDays, MIN_TREND_DAYS, MAX_TREND_DAYS);
        int normalizedRecentLogLimit = clamp(recentLogLimit, MIN_RECENT_LOG_LIMIT, MAX_RECENT_LOG_LIMIT);
        int normalizedVaccinationLimit = clamp(
                upcomingVaccinationLimit,
                MIN_UPCOMING_VACCINATION_LIMIT,
                MAX_UPCOMING_VACCINATION_LIMIT
        );

        List<BabyLogResponse> recentLogs = babyLogRepository
                .findByBabyIdOrderByLoggedAtDesc(babyId, PageRequest.of(0, normalizedRecentLogLimit))
                .stream()
                .map(this::toBabyLogResponse)
                .toList();

        return new BabyDashboardResponse(
                toBabyResponse(baby),
                buildDailySummary(babyId, targetDate),
                buildDailyTrend(babyId, targetDate, normalizedTrendDays),
                recentLogs,
                growthFeatureEnabled ? buildGrowthInsight(babyId) : null,
                buildVaccinationInsight(babyId, targetDate, normalizedVaccinationLimit)
        );
    }

    private BabyDailySummaryResponse buildDailySummary(Long babyId, LocalDate targetDate) {
        OffsetDateTime from = targetDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = targetDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<BabyLogEntity> dailyLogs = babyLogRepository.findByBabyIdAndLoggedAtBetweenOrderByLoggedAtDesc(babyId, from, to);
        BigDecimal sleepHours = dailyLogs.stream()
                .filter(log -> log.getLogType() == BabyLogType.SLEEP)
                .map(log -> nullToZero(log.getValue()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long feedings = dailyLogs.stream().filter(log -> log.getLogType() == BabyLogType.FEEDING).count();
        long diaperChanges = dailyLogs.stream().filter(log -> log.getLogType() == BabyLogType.DIAPER).count();

        List<BabyLogEntity> allLogs = babyLogRepository.findByBabyIdOrderByLoggedAtDesc(babyId);
        OffsetDateTime lastUpdatedAt = babyLogRepository.findFirstByBabyIdOrderByLoggedAtDesc(babyId)
                .map(BabyLogEntity::getLoggedAt)
                .orElse(null);
        long careStreakDays = calculateCareStreak(targetDate, allLogs);

        BigDecimal latestWeight = growthRecordRepository
                .findFirstByBabyIdAndMeasuredAtLessThanEqualOrderByMeasuredAtDesc(babyId, targetDate)
                .map(GrowthRecordEntity::getWeightKg)
                .orElse(null);

        LocalDate nextVaccination = vaccinationRepository
                .findFirstByBabyIdAndCompletedFalseAndDueDateGreaterThanEqualOrderByDueDateAsc(babyId, targetDate)
                .map(VaccinationEntity::getDueDate)
                .orElse(null);

        return new BabyDailySummaryResponse(
                babyId,
                targetDate,
                sleepHours,
                feedings,
                diaperChanges,
                latestWeight,
                nextVaccination,
                careStreakDays,
                lastUpdatedAt
        );
    }

    private List<BabyCareTrendPointResponse> buildDailyTrend(Long babyId, LocalDate targetDate, int trendDays) {
        LocalDate startDate = targetDate.minusDays(trendDays - 1L);
        OffsetDateTime from = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = targetDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<BabyLogEntity> trendLogs = babyLogRepository
                .findByBabyIdAndLoggedAtBetweenOrderByLoggedAtAsc(babyId, from, to);

        Map<LocalDate, TrendAccumulator> byDate = new HashMap<>();
        for (BabyLogEntity log : trendLogs) {
            LocalDate logDate = log.getLoggedAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate();
            TrendAccumulator accumulator = byDate.computeIfAbsent(logDate, ignored -> new TrendAccumulator());
            accumulator.totalLogs++;
            if (log.getLogType() == BabyLogType.SLEEP) {
                accumulator.sleepHours = accumulator.sleepHours.add(nullToZero(log.getValue()));
            } else if (log.getLogType() == BabyLogType.FEEDING) {
                accumulator.feedings++;
            } else if (log.getLogType() == BabyLogType.DIAPER) {
                accumulator.diaperChanges++;
            }
        }

        List<BabyCareTrendPointResponse> trend = new ArrayList<>(trendDays);
        LocalDate cursor = startDate;
        for (int i = 0; i < trendDays; i++) {
            TrendAccumulator accumulator = byDate.get(cursor);
            trend.add(new BabyCareTrendPointResponse(
                    cursor,
                    accumulator != null ? accumulator.sleepHours : BigDecimal.ZERO,
                    accumulator != null ? accumulator.feedings : 0L,
                    accumulator != null ? accumulator.diaperChanges : 0L,
                    accumulator != null ? accumulator.totalLogs : 0L
            ));
            cursor = cursor.plusDays(1);
        }

        return trend;
    }

    private BabyGrowthInsightResponse buildGrowthInsight(Long babyId) {
        List<GrowthRecordEntity> recentRecords = growthRecordRepository
                .findByBabyIdOrderByMeasuredAtDesc(babyId, PageRequest.of(0, 2));

        GrowthRecordEntity latest = recentRecords.size() > 0 ? recentRecords.get(0) : null;
        GrowthRecordEntity previous = recentRecords.size() > 1 ? recentRecords.get(1) : null;

        return new BabyGrowthInsightResponse(
                latest != null ? toGrowthRecordResponse(latest) : null,
                previous != null ? toGrowthRecordResponse(previous) : null,
                subtractNullable(latest != null ? latest.getWeightKg() : null, previous != null ? previous.getWeightKg() : null),
                subtractNullable(latest != null ? latest.getHeightCm() : null, previous != null ? previous.getHeightCm() : null),
                subtractNullable(
                        latest != null ? latest.getHeadCircumferenceCm() : null,
                        previous != null ? previous.getHeadCircumferenceCm() : null
                )
        );
    }

    private BabyVaccinationInsightResponse buildVaccinationInsight(Long babyId, LocalDate targetDate, int upcomingLimit) {
        List<VaccinationEntity> upcoming = vaccinationRepository
                .findByBabyIdAndCompletedFalseOrderByDueDateAsc(babyId, PageRequest.of(0, upcomingLimit));

        LocalDate nextDueDate = upcoming.isEmpty() ? null : upcoming.get(0).getDueDate();
        long upcomingCount = vaccinationRepository
                .countByBabyIdAndCompletedFalseAndDueDateGreaterThanEqual(babyId, targetDate);
        long overdueCount = vaccinationRepository
                .countByBabyIdAndCompletedFalseAndDueDateLessThan(babyId, targetDate);

        return new BabyVaccinationInsightResponse(
                nextDueDate,
                upcomingCount,
                overdueCount,
                upcoming.stream().map(this::toVaccinationResponse).toList()
        );
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(value, max));
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal subtractNullable(BigDecimal latest, BigDecimal previous) {
        if (latest == null || previous == null) {
            return null;
        }
        return latest.subtract(previous);
    }

    private OffsetDateTime resolveLoggedAt(OffsetDateTime loggedAt) {
        return loggedAt != null ? loggedAt : OffsetDateTime.now(ZoneOffset.UTC);
    }

    private long calculateCareStreak(LocalDate targetDate, List<BabyLogEntity> logs) {
        if (logs.isEmpty()) {
            return 0;
        }

        Set<LocalDate> loggedDates = logs.stream()
                .map(log -> log.getLoggedAt().atZoneSameInstant(ZoneOffset.UTC).toLocalDate())
                .collect(Collectors.toSet());

        long streak = 0;
        LocalDate cursor = targetDate;
        while (loggedDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private BabyEntity getBabyEntity(Long babyId) {
        BabyEntity baby = babyRepository.findById(babyId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));

        DataIsolationUtil.validateFamilyAccess(baby.getFamilyId());

        return baby;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BabyResponse toBabyResponse(BabyEntity baby) {
        return new BabyResponse(
                baby.getId(),
                baby.getFamilyId(),
                baby.getName(),
                baby.getBirthDate(),
                baby.getGender(),
                baby.getNotes()
        );
    }

    private BabyLogResponse toBabyLogResponse(BabyLogEntity log) {
        return new BabyLogResponse(
                log.getId(),
                log.getBabyId(),
                log.getLogType(),
                log.getValue(),
                log.getNote(),
                log.getLoggedAt()
        );
    }

    private VaccinationResponse toVaccinationResponse(VaccinationEntity vaccination) {
        return new VaccinationResponse(
                vaccination.getId(),
                vaccination.getBabyId(),
                vaccination.getVaccineName(),
                vaccination.getDueDate(),
                vaccination.isCompleted(),
                vaccination.getCompletedAt(),
                vaccination.getNotes()
        );
    }

    private GrowthRecordResponse toGrowthRecordResponse(GrowthRecordEntity record) {
        return new GrowthRecordResponse(
                record.getId(),
                record.getBabyId(),
                record.getMeasuredAt(),
                record.getWeightKg(),
                record.getHeightCm(),
                record.getHeadCircumferenceCm(),
                record.getNotes()
        );
    }

    private static final class TrendAccumulator {
        private BigDecimal sleepHours = BigDecimal.ZERO;
        private long feedings = 0;
        private long diaperChanges = 0;
        private long totalLogs = 0;
    }

    @Transactional
    public BatchImportResponse importBabiesBatch(BatchImportBabiesRequest request) {
        int success = 0;
        int failed = 0;
        List<BatchImportResponse.RowError> errors = new java.util.ArrayList<>();

        if (request.babies() != null) {
            for (int i = 0; i < request.babies().size(); i++) {
                CreateBabyRequest req = request.babies().get(i);
                try {
                    createBaby(req);
                    success++;
                } catch (Exception e) {
                    failed++;
                    errors.add(new BatchImportResponse.RowError(i, e.getMessage()));
                }
            }
        }

        return new BatchImportResponse(success, failed, errors);
    }
}
