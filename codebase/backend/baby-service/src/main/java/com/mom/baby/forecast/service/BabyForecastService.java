package com.mom.baby.forecast.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mom.baby.domain.BabyEntity;
import com.mom.baby.domain.BabyLogEntity;
import com.mom.baby.domain.BabyLogType;
import com.mom.baby.forecast.controller.dto.BabyForecastAnomalyResponse;
import com.mom.baby.forecast.controller.dto.BabyForecastResponse;
import com.mom.baby.forecast.domain.BabyForecastAnomalyEntity;
import com.mom.baby.forecast.domain.BabyForecastProcessedMessageEntity;
import com.mom.baby.forecast.domain.BabyForecastRiskLevel;
import com.mom.baby.forecast.domain.BabyForecastSnapshotEntity;
import com.mom.baby.forecast.event.BabyActivityRecordedMessage;
import com.mom.baby.forecast.event.BabyForecastEventPublisher;
import com.mom.baby.forecast.repository.BabyForecastAnomalyRepository;
import com.mom.baby.forecast.repository.BabyForecastProcessedMessageRepository;
import com.mom.baby.forecast.repository.BabyForecastSnapshotRepository;
import com.mom.baby.repository.BabyLogRepository;
import com.mom.baby.repository.BabyRepository;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.common.kafka.BaseEvent;
import com.mom.common.kafka.EventTopics;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BabyForecastService {

    private static final int LOOKBACK_DAYS = 14;
    private static final int HORIZON_HOURS = 24;
    private static final BigDecimal LOW_SLEEP_RATIO = new BigDecimal("0.70");

    private final BabyRepository babyRepository;
    private final BabyLogRepository babyLogRepository;
    private final BabyForecastSnapshotRepository snapshotRepository;
    private final BabyForecastAnomalyRepository anomalyRepository;
    private final BabyForecastProcessedMessageRepository processedMessageRepository;
    private final BabyForecastEventPublisher forecastEventPublisher;
    private final KafkaTemplate<String, BaseEvent<?>> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Transactional
    public void processActivityMessage(BabyActivityRecordedMessage message, String queueName) {
        if (processedMessageRepository.existsByMessageIdAndQueueName(message.messageId(), queueName)) {
            log.info("Skipping duplicate baby forecast message {} from {}", message.messageId(), queueName);
            return;
        }

        BabyEntity baby = babyRepository.findById(message.babyId())
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));

        BabyForecastSnapshotEntity snapshot = generateForecast(baby, message);
        snapshotRepository.save(snapshot);

        if (snapshot.getRiskLevel() == BabyForecastRiskLevel.HIGH) {
            publishHighRiskNotification(snapshot);
        }

        BabyForecastProcessedMessageEntity processed = new BabyForecastProcessedMessageEntity();
        processed.setMessageId(message.messageId());
        processed.setQueueName(queueName);
        processed.setProcessedAt(OffsetDateTime.now());
        processedMessageRepository.save(processed);
    }

    public BabyForecastResponse getLatest(Long babyId) {
        BabyEntity baby = getAccessibleBaby(babyId);
        return snapshotRepository.findFirstByBabyIdOrderByGeneratedAtDesc(baby.getId())
                .map(this::toForecastResponse)
                .orElse(null);
    }

    public List<BabyForecastResponse> getHistory(Long babyId, LocalDate from, LocalDate to) {
        BabyEntity baby = getAccessibleBaby(babyId);
        LocalDate resolvedFrom = from != null ? from : LocalDate.now(ZoneOffset.UTC).minusDays(14);
        LocalDate resolvedTo = to != null ? to : LocalDate.now(ZoneOffset.UTC);
        OffsetDateTime fromDateTime = resolvedFrom.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime toDateTime = resolvedTo.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);
        return snapshotRepository.findByBabyIdAndGeneratedAtBetweenOrderByGeneratedAtDesc(baby.getId(), fromDateTime, toDateTime)
                .stream()
                .map(this::toForecastResponse)
                .toList();
    }

    public List<BabyForecastAnomalyResponse> getAnomalies(Long babyId, boolean openOnly) {
        BabyEntity baby = getAccessibleBaby(babyId);
        List<BabyForecastAnomalyEntity> anomalies = openOnly
                ? anomalyRepository.findByBabyIdAndResolvedAtIsNullOrderByDetectedAtDesc(baby.getId())
                : anomalyRepository.findByBabyIdOrderByDetectedAtDesc(baby.getId());
        return anomalies.stream().map(this::toAnomalyResponse).toList();
    }

    @Transactional
    public BabyForecastAnomalyResponse resolveAnomaly(Long babyId, Long anomalyId) {
        BabyEntity baby = getAccessibleBaby(babyId);
        BabyForecastAnomalyEntity anomaly = anomalyRepository.findById(anomalyId)
                .orElseThrow(() -> new ResourceNotFoundException("Forecast anomaly not found"));
        if (!baby.getId().equals(anomaly.getBabyId())) {
            throw new ResourceNotFoundException("Forecast anomaly not found");
        }
        anomaly.setResolvedAt(OffsetDateTime.now());
        return toAnomalyResponse(anomalyRepository.save(anomaly));
    }

    public void queueRefresh(Long babyId) {
        BabyEntity baby = getAccessibleBaby(babyId);
        forecastEventPublisher.publishManualRefresh(baby.getId(), baby.getFamilyId());
    }

    private BabyForecastSnapshotEntity generateForecast(BabyEntity baby, BabyActivityRecordedMessage message) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime from = now.minusDays(LOOKBACK_DAYS);
        List<BabyLogEntity> logs = babyLogRepository.findByBabyIdAndLoggedAtBetweenOrderByLoggedAtAsc(
                baby.getId(),
                from,
                now.plusMinutes(1)
        );

        List<BabyLogEntity> sleepLogs = logs.stream().filter(log -> log.getLogType() == BabyLogType.SLEEP).toList();
        List<BabyLogEntity> feedingLogs = logs.stream().filter(log -> log.getLogType() == BabyLogType.FEEDING).toList();
        List<BabyLogEntity> diaperLogs = logs.stream().filter(log -> log.getLogType() == BabyLogType.DIAPER).toList();

        BigDecimal todaySleepHours = totalSleepHours(logs, now.toLocalDate());
        BigDecimal baselineSleepHours = averageDailySleepHours(sleepLogs);
        double feedingIntervalHours = medianIntervalHours(feedingLogs);
        double sleepIntervalHours = medianIntervalHours(sleepLogs);
        long todayFeedings = countToday(feedingLogs, now.toLocalDate());
        long todayDiapers = countToday(diaperLogs, now.toLocalDate());

        OffsetDateTime sleepWindowStart = nextWindowStart(latestOf(sleepLogs), sleepIntervalHours, now, 2);
        OffsetDateTime feedingWindowStart = nextWindowStart(latestOf(feedingLogs), feedingIntervalHours, now, 3);
        BabyForecastRiskLevel riskLevel = calculateRisk(todaySleepHours, baselineSleepHours, todayFeedings, todayDiapers, message);

        List<Map<String, Object>> recommendations = buildRecommendations(riskLevel, todaySleepHours, baselineSleepHours, todayFeedings, todayDiapers);
        Map<String, Object> signals = new HashMap<>();
        signals.put("lookbackDays", LOOKBACK_DAYS);
        signals.put("todaySleepHours", todaySleepHours);
        signals.put("baselineSleepHours", baselineSleepHours);
        signals.put("todayFeedings", todayFeedings);
        signals.put("todayDiapers", todayDiapers);
        signals.put("feedingIntervalHours", round(feedingIntervalHours));
        signals.put("sleepIntervalHours", round(sleepIntervalHours));
        signals.put("sourceLogId", message.babyLogId());
        signals.put("manualRefresh", message.manualRefresh());

        BabyForecastSnapshotEntity snapshot = new BabyForecastSnapshotEntity();
        snapshot.setBabyId(baby.getId());
        snapshot.setFamilyId(baby.getFamilyId());
        snapshot.setForecastDate(now.toLocalDate());
        snapshot.setGeneratedAt(now);
        snapshot.setHorizonHours(HORIZON_HOURS);
        snapshot.setSleepWindowStart(sleepWindowStart);
        snapshot.setSleepWindowEnd(sleepWindowStart.plusHours(1));
        snapshot.setFeedingWindowStart(feedingWindowStart);
        snapshot.setFeedingWindowEnd(feedingWindowStart.plusMinutes(45));
        snapshot.setRiskLevel(riskLevel);
        snapshot.setSummary(buildSummary(riskLevel, sleepWindowStart, feedingWindowStart));
        snapshot.setRecommendationsJson(toJson(recommendations));
        snapshot.setSignalsJson(toJson(signals));

        if (riskLevel != BabyForecastRiskLevel.LOW) {
            anomalyRepository.save(buildAnomaly(baby, message, riskLevel, snapshot.getSummary(), signals));
        }

        return snapshot;
    }

    private BabyForecastRiskLevel calculateRisk(
            BigDecimal todaySleepHours,
            BigDecimal baselineSleepHours,
            long todayFeedings,
            long todayDiapers,
            BabyActivityRecordedMessage message
    ) {
        if (baselineSleepHours.compareTo(BigDecimal.ZERO) > 0
                && todaySleepHours.compareTo(baselineSleepHours.multiply(LOW_SLEEP_RATIO)) < 0
                && OffsetDateTime.now(ZoneOffset.UTC).getHour() >= 18) {
            return BabyForecastRiskLevel.HIGH;
        }
        if (message.logType() == BabyLogType.SLEEP && nullToZero(message.value()).compareTo(new BigDecimal("0.25")) <= 0) {
            return BabyForecastRiskLevel.MEDIUM;
        }
        if (todayFeedings <= 1 && OffsetDateTime.now(ZoneOffset.UTC).getHour() >= 14) {
            return BabyForecastRiskLevel.MEDIUM;
        }
        if (todayDiapers == 0 && OffsetDateTime.now(ZoneOffset.UTC).getHour() >= 16) {
            return BabyForecastRiskLevel.MEDIUM;
        }
        return BabyForecastRiskLevel.LOW;
    }

    private BabyForecastAnomalyEntity buildAnomaly(
            BabyEntity baby,
            BabyActivityRecordedMessage message,
            BabyForecastRiskLevel riskLevel,
            String summary,
            Map<String, Object> signals
    ) {
        BabyForecastAnomalyEntity anomaly = new BabyForecastAnomalyEntity();
        anomaly.setBabyId(baby.getId());
        anomaly.setFamilyId(baby.getFamilyId());
        anomaly.setSourceLogId(message.babyLogId());
        anomaly.setAnomalyType(riskLevel == BabyForecastRiskLevel.HIGH ? "LOW_SLEEP_TREND" : "RHYTHM_SHIFT");
        anomaly.setSeverity(riskLevel);
        anomaly.setMessage(summary);
        anomaly.setDetectedAt(OffsetDateTime.now(ZoneOffset.UTC));
        anomaly.setMetadataJson(toJson(signals));
        return anomaly;
    }

    private void publishHighRiskNotification(BabyForecastSnapshotEntity snapshot) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("channel", "PUSH");
        payload.put("type", "INFO");
        payload.put("title", "Baby rhythm alert");
        payload.put("message", snapshot.getSummary());
        payload.put("metadataJson", snapshot.getSignalsJson());
        payload.put("scheduledAt", OffsetDateTime.now(ZoneOffset.UTC).toString());

        BaseEvent<Map<String, Object>> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                EventTopics.NOTIFICATION_REQUESTED,
                OffsetDateTime.now(ZoneOffset.UTC),
                snapshot.getFamilyId(),
                null,
                payload
        );
        kafkaTemplate.send(EventTopics.NOTIFICATION_REQUESTED, String.valueOf(snapshot.getBabyId()), event);
    }

    private BabyEntity getAccessibleBaby(Long babyId) {
        BabyEntity baby = babyRepository.findById(babyId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));
        DataIsolationUtil.validateFamilyAccess(baby.getFamilyId());
        return baby;
    }

    private BigDecimal averageDailySleepHours(List<BabyLogEntity> sleepLogs) {
        if (sleepLogs.isEmpty()) {
            return BigDecimal.ZERO;
        }
        Map<LocalDate, BigDecimal> byDate = new HashMap<>();
        sleepLogs.forEach(log -> byDate.merge(log.getLoggedAt().toLocalDate(), nullToZero(log.getValue()), BigDecimal::add));
        BigDecimal total = byDate.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(Math.max(1, byDate.size())), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal totalSleepHours(List<BabyLogEntity> logs, LocalDate date) {
        return logs.stream()
                .filter(log -> log.getLogType() == BabyLogType.SLEEP)
                .filter(log -> log.getLoggedAt().toLocalDate().equals(date))
                .map(log -> nullToZero(log.getValue()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long countToday(List<BabyLogEntity> logs, LocalDate date) {
        return logs.stream().filter(log -> log.getLoggedAt().toLocalDate().equals(date)).count();
    }

    private double medianIntervalHours(List<BabyLogEntity> logs) {
        if (logs.size() < 2) {
            return 0;
        }
        List<Double> intervals = new ArrayList<>();
        List<BabyLogEntity> sorted = logs.stream()
                .sorted(Comparator.comparing(BabyLogEntity::getLoggedAt))
                .toList();
        for (int i = 1; i < sorted.size(); i++) {
            double hours = Duration.between(sorted.get(i - 1).getLoggedAt(), sorted.get(i).getLoggedAt()).toMinutes() / 60.0;
            if (hours > 0 && hours <= 24) {
                intervals.add(hours);
            }
        }
        if (intervals.isEmpty()) {
            return 0;
        }
        intervals.sort(Double::compareTo);
        return intervals.get(intervals.size() / 2);
    }

    private OffsetDateTime nextWindowStart(BabyLogEntity latestLog, double intervalHours, OffsetDateTime now, int fallbackHours) {
        if (latestLog == null || intervalHours <= 0) {
            return now.plusHours(fallbackHours);
        }
        OffsetDateTime candidate = latestLog.getLoggedAt().plusMinutes(Math.round(intervalHours * 60));
        while (candidate.isBefore(now)) {
            candidate = candidate.plusMinutes(Math.round(intervalHours * 60));
        }
        return candidate;
    }

    private BabyLogEntity latestOf(List<BabyLogEntity> logs) {
        return logs.stream()
                .max(Comparator.comparing(BabyLogEntity::getLoggedAt))
                .orElse(null);
    }

    private List<Map<String, Object>> buildRecommendations(
            BabyForecastRiskLevel riskLevel,
            BigDecimal todaySleepHours,
            BigDecimal baselineSleepHours,
            long todayFeedings,
            long todayDiapers
    ) {
        List<Map<String, Object>> recommendations = new ArrayList<>();
        if (riskLevel == BabyForecastRiskLevel.HIGH) {
            recommendations.add(Map.of("key", "momApp.baby.forecast.recommendations.highRisk1", "params", Map.of()));
            recommendations.add(Map.of("key", "momApp.baby.forecast.recommendations.highRisk2", "params", Map.of()));
        } else if (riskLevel == BabyForecastRiskLevel.MEDIUM) {
            recommendations.add(Map.of("key", "momApp.baby.forecast.recommendations.mediumRisk", "params", Map.of()));
        } else {
            recommendations.add(Map.of("key", "momApp.baby.forecast.recommendations.lowRisk", "params", Map.of()));
        }
        if (baselineSleepHours.compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add(Map.of(
                    "key", "momApp.baby.forecast.recommendations.sleepCompare",
                    "params", Map.of("today", todaySleepHours, "baseline", baselineSleepHours)
            ));
        }
        recommendations.add(Map.of(
                "key", "momApp.baby.forecast.recommendations.stats",
                "params", Map.of("feedings", todayFeedings, "diapers", todayDiapers)
        ));
        return recommendations;
    }

    private String buildSummary(BabyForecastRiskLevel riskLevel, OffsetDateTime sleepWindowStart, OffsetDateTime feedingWindowStart) {
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
        String sleepStr = sleepWindowStart.atZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).format(formatter);
        String feedingStr = feedingWindowStart.atZoneSameInstant(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).format(formatter);
        String base = "Dự báo gần nhất: bé có thể buồn ngủ quanh " + sleepStr
                + " và có bữa ăn tiếp theo quanh " + feedingStr + ".";
        if (riskLevel == BabyForecastRiskLevel.HIGH) {
            return base + " Nhịp hôm nay đang lệch rõ, nên theo dõi sát hơn.";
        }
        if (riskLevel == BabyForecastRiskLevel.MEDIUM) {
            return base + " Có một vài tín hiệu lệch nhịp nhẹ.";
        }
        return base + " Chưa thấy tín hiệu bất thường lớn.";
    }

    private BabyForecastResponse toForecastResponse(BabyForecastSnapshotEntity entity) {
        return new BabyForecastResponse(
                entity.getId(),
                entity.getBabyId(),
                entity.getFamilyId(),
                entity.getForecastDate(),
                entity.getGeneratedAt(),
                entity.getHorizonHours(),
                entity.getSleepWindowStart(),
                entity.getSleepWindowEnd(),
                entity.getFeedingWindowStart(),
                entity.getFeedingWindowEnd(),
                entity.getRiskLevel(),
                entity.getSummary(),
                entity.getRecommendationsJson(),
                entity.getSignalsJson()
        );
    }

    private BabyForecastAnomalyResponse toAnomalyResponse(BabyForecastAnomalyEntity entity) {
        return new BabyForecastAnomalyResponse(
                entity.getId(),
                entity.getBabyId(),
                entity.getFamilyId(),
                entity.getSourceLogId(),
                entity.getAnomalyType(),
                entity.getSeverity(),
                entity.getMessage(),
                entity.getDetectedAt(),
                entity.getResolvedAt(),
                entity.getMetadataJson()
        );
    }

    private BigDecimal nullToZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private double round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "[]";
        }
    }
}
