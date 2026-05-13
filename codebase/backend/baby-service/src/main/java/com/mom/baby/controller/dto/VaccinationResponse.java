package com.mom.baby.controller.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record VaccinationResponse(
        Long id,
        Long babyId,
        String vaccineName,
        LocalDate dueDate,
        boolean completed,
        OffsetDateTime completedAt,
        String notes
) {
}
