package com.mom.expense.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record CreateBudgetRequest(
        @NotNull Long familyId,
        @NotBlank @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "must follow YYYY-MM")
        String month,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal limitAmount
) {
}
