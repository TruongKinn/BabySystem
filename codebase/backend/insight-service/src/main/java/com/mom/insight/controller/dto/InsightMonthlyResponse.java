package com.mom.insight.controller.dto;

import java.math.BigDecimal;
import java.util.List;

public record InsightMonthlyResponse(
        Long familyId,
        String month,
        BigDecimal expenseTotal,
        long expenseCount,
        long mealsPlanned,
        long tasksCreated,
        long tasksCompleted,
        BigDecimal babySleepHours,
        long babyFeedings,
        long diaperChanges,
        List<DailyItem> dailyBreakdown,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public record DailyItem(
            String date,
            BigDecimal expenseTotal,
            long pendingTasks,
            BigDecimal babySleepHours
    ) {
    }
}
