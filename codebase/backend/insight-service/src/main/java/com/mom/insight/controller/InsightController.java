package com.mom.insight.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.insight.controller.dto.InsightDailyResponse;
import com.mom.insight.controller.dto.InsightDashboardResponse;
import com.mom.insight.controller.dto.InsightMonthlyResponse;
import com.mom.insight.service.InsightService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InsightController {

    private final InsightService insightService;

    @GetMapping("/insights/daily")
    public ApiResponse<InsightDailyResponse> getDaily(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Success", insightService.getDaily(familyId, date));
    }

    @GetMapping("/insights/dashboard")
    public ApiResponse<InsightDashboardResponse> getDashboard(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Success", insightService.getDashboard(familyId, date));
    }

    @GetMapping("/insights/monthly")
    public ApiResponse<InsightMonthlyResponse> getMonthly(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "month", required = false) String month
    ) {
        YearMonth parsedMonth = (month == null || month.isBlank()) ? null : YearMonth.parse(month);
        return ApiResponse.ok("Success", insightService.getMonthly(familyId, parsedMonth));
    }
}
