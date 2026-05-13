package com.mom.expense.event;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ExpenseChangedPayload(
        Long expenseId,
        Long familyId,
        Long categoryId,
        BigDecimal amount,
        String currency,
        String note,
        OffsetDateTime spentAt
) {
}
