package com.mom.baby.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateVaccinationRequest(
        @NotBlank @Size(max = 160) String vaccineName,
        @NotNull LocalDate dueDate,
        Boolean completed,
        @Size(max = 500) String notes
) {
}
