package com.mom.expense.controller.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import java.io.Serializable;

public record ExchangeRateResponse(
        String currency,
        BigDecimal buyRate,
        BigDecimal sellRate,
        OffsetDateTime updatedAt
) implements Serializable {
    private static final long serialVersionUID = 1L;
}
