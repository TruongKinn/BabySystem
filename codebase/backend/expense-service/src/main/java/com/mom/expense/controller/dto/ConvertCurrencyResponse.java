package com.mom.expense.controller.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ConvertCurrencyResponse(
        String fromCurrency,
        BigDecimal originalAmount,
        BigDecimal amountVnd,
        BigDecimal sellRate,
        OffsetDateTime rateUpdatedAt
) {
}
