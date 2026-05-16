package com.mom.baby.controller.dto;

import java.time.LocalDate;
import java.util.List;

public record BabyVaccinationInsightResponse(
        LocalDate nextDueDate,
        long upcomingCount,
        long overdueCount,
        List<VaccinationResponse> upcomingVaccinations
) {
}
