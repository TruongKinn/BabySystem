package com.mom.expense.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateInvoiceItemRequest(
        @NotBlank String name,
        @NotNull @DecimalMin(value = "0.01") BigDecimal quantity,
        @NotNull @DecimalMin(value = "0.00") BigDecimal price,
        @NotNull BigDecimal tax
) {}
