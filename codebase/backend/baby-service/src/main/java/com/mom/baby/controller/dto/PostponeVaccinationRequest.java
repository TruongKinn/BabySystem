package com.mom.baby.controller.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PostponeVaccinationRequest(
        @NotNull LocalDate newDueDate,
        @Size(max = 500) String reason
) {
}
