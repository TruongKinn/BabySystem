package com.mom.baby.controller.dto;

import com.mom.baby.domain.BabyGender;

import java.time.LocalDate;

public record BabyResponse(
        Long id,
        Long familyId,
        String name,
        LocalDate birthDate,
        BabyGender gender,
        String notes
) {
}
