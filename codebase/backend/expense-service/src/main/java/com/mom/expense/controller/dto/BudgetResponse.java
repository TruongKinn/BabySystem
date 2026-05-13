package com.mom.expense.controller.dto;

import java.math.BigDecimal;

public record BudgetResponse(
        Long id,
        Long familyId,
        String month,
        BigDecimal limitAmount
) {
}
