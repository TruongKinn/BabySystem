package com.mom.expense.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record UpdateExpenseRequest(
        Long categoryId,
        @DecimalMin(value = "0.01", inclusive = true) BigDecimal amount,
        @Pattern(regexp = "^[A-Za-z]{3}$", message = "must be 3-letter currency code")
        String currency,
        @Size(max = 500) String note,
        OffsetDateTime spentAt
) {
}
