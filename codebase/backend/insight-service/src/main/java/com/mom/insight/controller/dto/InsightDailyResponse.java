package com.mom.insight.controller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InsightDailyResponse(
        Long familyId,
        LocalDate date,
        BigDecimal expenseTotal,
        long expenseCount,
        long mealsPlanned,
        long tasksCreated,
        long tasksCompleted,
        long pendingTasks,
        BigDecimal babySleepHours,
        long babyFeedings,
        long diaperChanges
) {
}
