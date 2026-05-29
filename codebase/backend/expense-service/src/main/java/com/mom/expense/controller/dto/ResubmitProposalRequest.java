package com.mom.expense.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ResubmitProposalRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String categoryName,
        @NotBlank String approver
) {}
