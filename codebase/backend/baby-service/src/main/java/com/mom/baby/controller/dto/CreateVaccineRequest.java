package com.mom.baby.controller.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVaccineRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 120) String manufacturer,
        @NotBlank @Size(max = 255) String diseasePrevented,
        @Min(1) int totalDoses,
        String description
) {
}
