package com.mom.baby.controller.dto;

import java.util.List;

public record BabyDashboardResponse(
        BabyResponse baby,
        BabyDailySummaryResponse dailySummary,
        List<BabyCareTrendPointResponse> dailyTrend,
        List<BabyLogResponse> recentLogs,
        BabyGrowthInsightResponse growthInsight,
        BabyVaccinationInsightResponse vaccinationInsight
) {
}
