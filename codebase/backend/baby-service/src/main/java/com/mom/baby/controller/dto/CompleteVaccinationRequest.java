package com.mom.baby.controller.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CompleteVaccinationRequest(
        @NotNull LocalDate actualDate,
        @Size(max = 200) String facility,
        @Size(max = 500) String postReaction,
        @Size(max = 500) String notes
) {
}
