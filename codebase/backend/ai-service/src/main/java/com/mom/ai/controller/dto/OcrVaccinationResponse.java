package com.mom.ai.controller.dto;

import java.util.List;

public record OcrVaccinationResponse(
        List<OcrVaccinationItem> vaccinations
) {
    public record OcrVaccinationItem(
            String vaccineName,
            Integer doseNumber,
            String dueDate,
            String notes
    ) {}
}
