package com.mom.expense.controller.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ExpenseResponse(
        Long id,
        Long familyId,
        Long categoryId,
        String categoryName,
        BigDecimal amount,
        String currency,
        String note,
        OffsetDateTime spentAt
) {
}
