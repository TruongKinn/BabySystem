package com.mom.baby.service;

import com.mom.baby.domain.BabyEntity;
import com.mom.baby.domain.VaccinationEntity;
import com.mom.baby.event.VaccinationEventPublisher;
import com.mom.baby.event.VaccinationReminderPayload;
import com.mom.baby.repository.BabyRepository;
import com.mom.baby.repository.VaccinationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class VaccinationScheduler {

    private final VaccinationRepository vaccinationRepository;
    private final BabyRepository babyRepository;
    private final VaccinationEventPublisher eventPublisher;

    /**
     * Chạy hằng ngày lúc 07:00 sáng để quét các mũi tiêm sắp đến hạn (trong vòng 1 ngày tới)
     * và gửi tin nhắn nhắc nhở qua Kafka.
     */
    @Scheduled(cron = "0 0 7 * * *")
    public void scanAndRemindVaccinations() {
        log.info("[VaccinationScheduler] Starting daily vaccination reminder scan...");
        LocalDate reminderThreshold = LocalDate.now().plusDays(1);
        List<VaccinationEntity> upcomingVaccinations = vaccinationRepository
                .findByCompletedFalseAndDueDateLessThanEqual(reminderThreshold);

        log.info("[VaccinationScheduler] Found {} upcoming vaccinations to remind.", upcomingVaccinations.size());

        for (VaccinationEntity vaccination : upcomingVaccinations) {
            babyRepository.findById(vaccination.getBabyId()).ifPresentOrElse(
                baby -> {
                    VaccinationReminderPayload payload = new VaccinationReminderPayload(
                            baby.getId(),
                            baby.getName(),
                            vaccination.getVaccine() != null ? vaccination.getVaccine().getId() : null,
                            vaccination.getVaccine() != null ? vaccination.getVaccine().getName() : vaccination.getVaccineName(),
                            vaccination.getDoseNumber(),
                            vaccination.getDueDate(),
                            baby.getFamilyId()
                    );
                    try {
                        eventPublisher.publishVaccinationReminder(payload);
                        log.info("[VaccinationScheduler] Successfully queued reminder for baby {} vaccine {}", baby.getId(), payload.vaccineName());
                    } catch (Exception e) {
                        log.error("[VaccinationScheduler] Failed to publish reminder for baby {} vaccine {}", baby.getId(), payload.vaccineName(), e);
                    }
                },
                () -> log.warn("[VaccinationScheduler] Baby not found for vaccination record id: {}", vaccination.getId())
            );
        }
        log.info("[VaccinationScheduler] Daily vaccination reminder scan finished.");
    }
}
