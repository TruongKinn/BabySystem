package com.mom.insight.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InsightDashboardResponse(
        Long familyId,
        LocalDate date,
        BigDecimal expenseToday,
        long pendingTasks,
        long mealsPlannedToday,
        BigDecimal babySleepHours,
        long babyFeedings,
        long diaperChanges,
        int moodScore
) {
}
