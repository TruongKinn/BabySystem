package com.mom.baby.forecast.controller;

import com.mom.baby.forecast.controller.dto.BabyForecastAnomalyResponse;
import com.mom.baby.forecast.controller.dto.BabyForecastRefreshResponse;
import com.mom.baby.forecast.controller.dto.BabyForecastResponse;
import com.mom.baby.forecast.service.BabyForecastService;
import com.mom.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/babies/{babyId}/forecast")
@RequiredArgsConstructor
public class BabyForecastController {

    private final BabyForecastService babyForecastService;

    @GetMapping("/latest")
    public ApiResponse<BabyForecastResponse> latest(@PathVariable Long babyId) {
        return ApiResponse.ok("Success", babyForecastService.getLatest(babyId));
    }

    @GetMapping("/history")
    public ApiResponse<List<BabyForecastResponse>> history(
            @PathVariable Long babyId,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok("Success", babyForecastService.getHistory(babyId, from, to));
    }

    @PostMapping("/refresh")
    public ApiResponse<BabyForecastRefreshResponse> refresh(@PathVariable Long babyId) {
        babyForecastService.queueRefresh(babyId);
        return ApiResponse.ok("Forecast refresh queued", new BabyForecastRefreshResponse(babyId, "QUEUED"));
    }

    @GetMapping("/anomalies")
    public ApiResponse<List<BabyForecastAnomalyResponse>> anomalies(
            @PathVariable Long babyId,
            @RequestParam(value = "openOnly", defaultValue = "true") boolean openOnly
    ) {
        return ApiResponse.ok("Success", babyForecastService.getAnomalies(babyId, openOnly));
    }

    @PatchMapping("/anomalies/{anomalyId}/resolve")
    public ApiResponse<BabyForecastAnomalyResponse> resolveAnomaly(
            @PathVariable Long babyId,
            @PathVariable Long anomalyId
    ) {
        return ApiResponse.ok("Forecast anomaly resolved", babyForecastService.resolveAnomaly(babyId, anomalyId));
    }
}
