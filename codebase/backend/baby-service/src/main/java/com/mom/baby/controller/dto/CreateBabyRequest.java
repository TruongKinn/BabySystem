package com.mom.baby.controller.dto;

import com.mom.baby.domain.BabyGender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateBabyRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 120) String name,
        @NotNull LocalDate birthDate,
        @NotNull BabyGender gender,
        @Size(max = 600) String notes
) {
}
