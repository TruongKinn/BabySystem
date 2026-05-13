package com.mom.expense.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateBudgetRequest(
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal limitAmount
) {
}
