package com.mom.file.controller.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateExpenseImportItem(
        Long familyId,
        Long categoryId,
        BigDecimal amount,
        String currency,
        String note,
        OffsetDateTime spentAt
) {}
