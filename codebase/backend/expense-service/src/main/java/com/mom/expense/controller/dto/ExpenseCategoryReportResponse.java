package com.mom.expense.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record ExpenseCategoryReportResponse(
        String month,
        BigDecimal totalAmount,
        List<CategoryReportItem> categories
) {
    public record CategoryReportItem(
            Long categoryId,
            String categoryName,
            BigDecimal totalAmount,
            long expenseCount,
            BigDecimal percentage
    ) {
    }
}
