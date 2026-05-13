package com.mom.expense.controller.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

public record ExpenseSummaryResponse(
        String month,
        BigDecimal totalAmount,
        List<CategorySummary> byCategories
) implements Serializable {

    private static final long serialVersionUID = 1L;

    public record CategorySummary(
            Long categoryId,
            String categoryName,
            BigDecimal totalAmount
    ) implements Serializable {

        private static final long serialVersionUID = 1L;
    }
}
