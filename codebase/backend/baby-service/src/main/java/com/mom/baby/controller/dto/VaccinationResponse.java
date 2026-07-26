package com.mom.baby.controller.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record VaccinationResponse(
        Long id,
        Long babyId,
        Long vaccineId,
        String vaccineName,
        int doseNumber,
        LocalDate dueDate,
        boolean completed,
        OffsetDateTime completedAt,
        String facility,
        String postReaction,
        String notes,
        String status
) {
}
