package com.mom.baby.service;

import com.mom.baby.controller.dto.OcrScanRequest;
import com.mom.baby.controller.dto.VaccinationResponse;
import com.mom.baby.domain.BabyEntity;
import com.mom.baby.domain.VaccineEntity;
import com.mom.baby.domain.VaccinationEntity;
import com.mom.baby.repository.BabyRepository;
import com.mom.baby.repository.VaccinationRepository;
import com.mom.baby.repository.VaccineRepository;
import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class VaccinationOcrService {

    private final BabyRepository babyRepository;
    private final VaccineRepository vaccineRepository;
    private final VaccinationRepository vaccinationRepository;
    private final RestClient.Builder restClientBuilder;

    @Value("${AI_SERVICE_URI:http://localhost:8090}")
    private String aiServiceUri;

    @Transactional
    public List<VaccinationResponse> scanAndImport(Long babyId, OcrScanRequest request) {
        // 1. Validate family access & baby existence
        BabyEntity baby = babyRepository.findById(babyId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));
        DataIsolationUtil.validateFamilyAccess(baby.getFamilyId());

        // 2. Prepare request payload for ai-service
        AiOcrVaccinationRequest aiRequest = new AiOcrVaccinationRequest(
                baby.getFamilyId(),
                request.fileId(),
                "vi"
        );

        log.info("[VaccinationOcrService] Sending OCR request to ai-service for fileId: {}", request.fileId());

        // 3. Make HTTP request to ai-service
        AiOcrVaccinationResponse aiResponse;
        try {
            RestClient.RequestHeadersSpec<?> clientRequest = restClientBuilder.build()
                    .post()
                    .uri(aiServiceUri + "/api/copilot/ocr-vaccinations")
                    .body(aiRequest);

            // Forward security headers
            Long userId = UserContext.getUserId();
            if (userId != null) {
                clientRequest = clientRequest.header("X-User-Id", String.valueOf(userId));
            }

            List<Long> familyIds = UserContext.getFamilyIds();
            if (familyIds != null && !familyIds.isEmpty()) {
                String familyIdsHeader = familyIds.stream()
                        .map(String::valueOf)
                        .reduce((left, right) -> left + "," + right)
                        .orElse("");
                if (StringUtils.hasText(familyIdsHeader)) {
                    clientRequest = clientRequest.header("X-Family-Ids", familyIdsHeader);
                }
            }
            clientRequest = clientRequest.header("X-User-Admin", String.valueOf(UserContext.isAdmin()));

            AiOcrEnvelope envelope = clientRequest.retrieve().body(AiOcrEnvelope.class);
            if (envelope == null || !envelope.success() || envelope.data() == null) {
                throw new RuntimeException("OCR service response indicates failure or empty data");
            }
            aiResponse = envelope.data();
        } catch (Exception e) {
            log.error("[VaccinationOcrService] Failed to perform OCR via ai-service", e);
            throw new RuntimeException("Lỗi nhận diện Sổ tiêm chủng từ AI: " + e.getMessage());
        }

        // 4. Match & import vaccination records
        List<VaccinationResponse> importedRecords = new ArrayList<>();
        if (aiResponse.vaccinations() != null) {
            for (AiOcrVaccinationItem item : aiResponse.vaccinations()) {
                try {
                    String cleanName = item.vaccineName().trim();
                    LocalDate date = LocalDate.parse(item.dueDate().trim());
                    int doseNum = item.doseNumber() != null ? item.doseNumber() : 1;

                    // Match with category database
                    Optional<VaccineEntity> matchedVaccine = vaccineRepository.findByName(cleanName);

                    if (matchedVaccine.isPresent()) {
                        VaccineEntity vaccine = matchedVaccine.get();
                        
                        // Check duplicate: vaccine_id + dose_number
                        Optional<VaccinationEntity> existing = vaccinationRepository
                                .findByBabyIdAndVaccineIdAndDoseNumber(babyId, vaccine.getId(), doseNum);
                        
                        if (existing.isEmpty()) {
                            // Import new completed record
                            VaccinationEntity record = new VaccinationEntity();
                            record.setBabyId(babyId);
                            record.setVaccine(vaccine);
                            record.setVaccineName(vaccine.getName());
                            record.setDoseNumber(doseNum);
                            record.setDueDate(date);
                            record.setCompleted(true);
                            record.setCompletedAt(date.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime());
                            record.setStatus("COMPLETED");
                            
                            String notes = "Import qua AI OCR";
                            if (StringUtils.hasText(item.notes())) {
                                notes += "; Ghi chú gốc: " + item.notes().trim();
                            }
                            record.setNotes(notes);

                            VaccinationEntity saved = vaccinationRepository.save(record);
                            importedRecords.add(toVaccinationResponse(saved));
                        }
                    } else {
                        // Match not found, import under raw name
                        // Check duplicate under raw name
                        boolean hasDuplicate = vaccinationRepository.findByBabyIdOrderByDueDateAsc(babyId).stream()
                                .anyMatch(v -> cleanName.equalsIgnoreCase(v.getVaccineName()) && v.getDoseNumber() == doseNum);

                        if (!hasDuplicate) {
                            VaccinationEntity record = new VaccinationEntity();
                            record.setBabyId(babyId);
                            record.setVaccineName(cleanName);
                            record.setDoseNumber(doseNum);
                            record.setDueDate(date);
                            record.setCompleted(true);
                            record.setCompletedAt(date.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime());
                            record.setStatus("COMPLETED");
                            
                            String notes = "Import qua AI OCR (Tên vắc-xin thô)";
                            if (StringUtils.hasText(item.notes())) {
                                notes += "; Ghi chú gốc: " + item.notes().trim();
                            }
                            record.setNotes(notes);

                            VaccinationEntity saved = vaccinationRepository.save(record);
                            importedRecords.add(toVaccinationResponse(saved));
                        }
                    }
                } catch (Exception e) {
                    log.warn("[VaccinationOcrService] Skipped processing parsed OCR item due to format error: {}", item, e);
                }
            }
        }

        return importedRecords;
    }

    private VaccinationResponse toVaccinationResponse(VaccinationEntity vaccination) {
        return new VaccinationResponse(
                vaccination.getId(),
                vaccination.getBabyId(),
                vaccination.getVaccine() != null ? vaccination.getVaccine().getId() : null,
                vaccination.getVaccine() != null ? vaccination.getVaccine().getName() : vaccination.getVaccineName(),
                vaccination.getDoseNumber(),
                vaccination.getDueDate(),
                vaccination.isCompleted(),
                vaccination.getCompletedAt(),
                vaccination.getFacility(),
                vaccination.getPostReaction(),
                vaccination.getNotes(),
                vaccination.getStatus()
        );
    }

    record AiOcrVaccinationRequest(
            Long familyId,
            Long fileId,
            String language
    ) {}

    record AiOcrEnvelope(
            boolean success,
            String message,
            AiOcrVaccinationResponse data
    ) {}

    record AiOcrVaccinationResponse(
            List<AiOcrVaccinationItem> vaccinations
    ) {}

    record AiOcrVaccinationItem(
            String vaccineName,
            Integer doseNumber,
            String dueDate,
            String notes
    ) {}
}
