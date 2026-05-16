package com.mom.baby.service;

import com.mom.baby.controller.dto.BabyDailySummaryResponse;
import com.mom.baby.controller.dto.BabyLogResponse;
import com.mom.baby.controller.dto.BabyResponse;
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
import com.mom.baby.repository.BabyLogRepository;
import com.mom.baby.repository.BabyRepository;
import com.mom.baby.repository.GrowthRecordRepository;
import com.mom.baby.repository.VaccinationRepository;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BabyService {

    private final BabyRepository babyRepository;
    private final BabyLogRepository babyLogRepository;
    private final VaccinationRepository vaccinationRepository;
    private final GrowthRecordRepository growthRecordRepository;
    private final BabyEventPublisher babyEventPublisher;

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
        log.setLoggedAt(request.loggedAt());
        BabyLogEntity saved = babyLogRepository.save(log);

        babyEventPublisher.publishBabyLogCreated(new BabyLogCreatedPayload(
                saved.getId(),
                saved.getBabyId(),
                baby.getFamilyId(),
                saved.getLogType(),
                saved.getValue(),
                saved.getLoggedAt()
        ));
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
        vaccination.setCompletedAt(vaccination.isCompleted() ? OffsetDateTime.now() : null);
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
        getBabyEntity(babyId);
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
        getBabyEntity(babyId);
        return growthRecordRepository.findByBabyIdOrderByMeasuredAtDesc(babyId).stream()
                .map(this::toGrowthRecordResponse)
                .toList();
    }

    public BabyDailySummaryResponse getDailySummary(Long babyId, LocalDate date) {
        getBabyEntity(babyId);

        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        OffsetDateTime from = targetDate.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = targetDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<BabyLogEntity> logs = babyLogRepository.findByBabyIdAndLoggedAtBetweenOrderByLoggedAtDesc(babyId, from, to);
        BigDecimal sleepHours = logs.stream()
                .filter(log -> log.getLogType() == BabyLogType.SLEEP)
                .map(log -> log.getValue() == null ? BigDecimal.ZERO : log.getValue())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long feedings = babyLogRepository.countByBabyIdAndLogTypeAndLoggedAtBetween(babyId, BabyLogType.FEEDING, from, to);
        long diaperChanges = babyLogRepository.countByBabyIdAndLogTypeAndLoggedAtBetween(babyId, BabyLogType.DIAPER, from, to);

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
                nextVaccination
        );
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
}
