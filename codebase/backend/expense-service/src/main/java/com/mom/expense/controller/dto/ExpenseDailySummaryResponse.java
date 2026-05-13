package com.mom.expense.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record ExpenseDailySummaryResponse(
        String date,
        BigDecimal totalAmount,
        List<CategorySummary> byCategories
) {
    public record CategorySummary(
            Long categoryId,
            String categoryName,
            BigDecimal totalAmount
    ) {
    }
}
