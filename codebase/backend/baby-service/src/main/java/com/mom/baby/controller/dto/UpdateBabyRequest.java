package com.mom.baby.controller.dto;

import com.mom.baby.domain.BabyGender;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateBabyRequest(
        @Pattern(regexp = ".*\\S.*", message = "name must not be blank")
        @Size(max = 120) String name,
        LocalDate birthDate,
        BabyGender gender,
        @Size(max = 600) String notes
) {
}
