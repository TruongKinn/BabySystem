package com.mom.baby.controller.dto;

import com.mom.baby.domain.BabyLogType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record CreateBabyLogRequest(
        @NotNull BabyLogType logType,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal value,
        @Size(max = 500) String note,
        OffsetDateTime loggedAt
) {
}
