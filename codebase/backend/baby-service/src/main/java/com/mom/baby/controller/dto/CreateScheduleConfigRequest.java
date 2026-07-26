package com.mom.baby.controller.dto;

import jakarta.validation.constraints.Min;

public record CreateScheduleConfigRequest(
        @Min(1) int doseNumber,
        @Min(0) int recommendedAgeMonths,
        @Min(0) int minDaysSincePreviousDose
) {
}
