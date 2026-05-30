package com.mom.file.controller.dto;

import java.util.List;

public record BatchImportVaccinationsRequest(
        Long babyId,
        List<VaccinationDto> vaccinations
) {
    public record VaccinationDto(
            String dateStr,
            String vaccineName,
            String shotNo,
            Double cost,
            String location,
            String nextDateStr
    ) {}
}
