package com.mom.file.controller.dto;

import java.util.List;

public record BatchImportGrowthRequest(
        Long babyId,
        List<GrowthDto> records
) {
    public record GrowthDto(
            String dateStr,
            String mealType,
            Double intake,
            Double height,
            Double weight,
            String notes
    ) {}
}
