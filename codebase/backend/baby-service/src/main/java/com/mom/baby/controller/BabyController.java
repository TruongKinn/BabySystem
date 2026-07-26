package com.mom.baby.controller;

import com.mom.baby.controller.dto.BabyDailySummaryResponse;
import com.mom.baby.controller.dto.BabyDashboardResponse;
import com.mom.baby.controller.dto.BabyLogResponse;
import com.mom.baby.controller.dto.BabyResponse;
import com.mom.baby.controller.dto.CreateBabyLogRequest;
import com.mom.baby.controller.dto.CreateBabyRequest;
import com.mom.baby.controller.dto.CreateGrowthRecordRequest;
import com.mom.baby.controller.dto.CreateVaccinationRequest;
import com.mom.baby.controller.dto.GrowthRecordResponse;
import com.mom.baby.controller.dto.UpdateBabyRequest;
import com.mom.baby.controller.dto.VaccinationResponse;
import com.mom.baby.controller.dto.BatchImportBabiesRequest;
import com.mom.baby.controller.dto.BatchImportResponse;
import com.mom.baby.controller.dto.CompleteVaccinationRequest;
import com.mom.baby.controller.dto.PostponeVaccinationRequest;
import com.mom.baby.controller.dto.OcrScanRequest;
import com.mom.baby.service.BabyService;
import com.mom.baby.service.VaccinationOcrService;
import com.mom.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BabyController {

    private final BabyService babyService;
    private final VaccinationOcrService vaccinationOcrService;

    @PostMapping("/babies")
    public ApiResponse<BabyResponse> createBaby(@Valid @RequestBody CreateBabyRequest request) {
        return ApiResponse.ok("Baby created", babyService.createBaby(request));
    }

    @GetMapping("/babies")
    public ApiResponse<List<BabyResponse>> getBabies(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", babyService.getBabies(familyId));
    }

    @GetMapping("/babies/{id}")
    public ApiResponse<BabyResponse> getBaby(@PathVariable("id") Long babyId) {
        return ApiResponse.ok("Success", babyService.getBaby(babyId));
    }

    @PutMapping("/babies/{id}")
    public ApiResponse<BabyResponse> updateBaby(
            @PathVariable("id") Long babyId,
            @Valid @RequestBody UpdateBabyRequest request
    ) {
        return ApiResponse.ok("Baby updated", babyService.updateBaby(babyId, request));
    }

    @DeleteMapping("/babies/{id}")
    public ApiResponse<Object> deleteBaby(@PathVariable("id") Long babyId) {
        babyService.deleteBaby(babyId);
        return ApiResponse.ok("Baby deleted", null);
    }

    @PostMapping("/babies/{id}/logs")
    public ApiResponse<BabyLogResponse> createLog(
            @PathVariable("id") Long babyId,
            @Valid @RequestBody CreateBabyLogRequest request
    ) {
        return ApiResponse.ok("Baby log created", babyService.createLog(babyId, request));
    }

    @GetMapping("/babies/{id}/logs")
    public ApiResponse<List<BabyLogResponse>> getLogs(
            @PathVariable("id") Long babyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Success", babyService.getLogs(babyId, date));
    }

    @PostMapping("/babies/{id}/vaccinations")
    public ApiResponse<VaccinationResponse> createVaccination(
            @PathVariable("id") Long babyId,
            @Valid @RequestBody CreateVaccinationRequest request
    ) {
        return ApiResponse.ok("Vaccination created", babyService.createVaccination(babyId, request));
    }

    @GetMapping("/babies/{id}/vaccinations")
    public ApiResponse<List<VaccinationResponse>> getVaccinations(@PathVariable("id") Long babyId) {
        return ApiResponse.ok("Success", babyService.getVaccinations(babyId));
    }

    @PostMapping("/babies/{id}/vaccinations/{vaccinationId}/complete")
    public ApiResponse<VaccinationResponse> completeVaccination(
            @PathVariable("id") Long babyId,
            @PathVariable("vaccinationId") Long vaccinationId,
            @Valid @RequestBody CompleteVaccinationRequest request
    ) {
        return ApiResponse.ok("Vaccination completed", babyService.completeVaccination(babyId, vaccinationId, request));
    }

    @PostMapping("/babies/{id}/vaccinations/{vaccinationId}/postpone")
    public ApiResponse<VaccinationResponse> postponeVaccination(
            @PathVariable("id") Long babyId,
            @PathVariable("vaccinationId") Long vaccinationId,
            @Valid @RequestBody PostponeVaccinationRequest request
    ) {
        return ApiResponse.ok("Vaccination postponed", babyService.postponeVaccination(babyId, vaccinationId, request));
    }

    @PostMapping("/babies/{id}/vaccinations/scan")
    public ApiResponse<List<VaccinationResponse>> scanVaccinations(
            @PathVariable("id") Long babyId,
            @Valid @RequestBody OcrScanRequest request
    ) {
        return ApiResponse.ok("OCR vaccination extraction complete", vaccinationOcrService.scanAndImport(babyId, request));
    }

    @PostMapping("/babies/{id}/growth-records")
    public ApiResponse<GrowthRecordResponse> createGrowthRecord(
            @PathVariable("id") Long babyId,
            @Valid @RequestBody CreateGrowthRecordRequest request
    ) {
        return ApiResponse.ok("Growth record created", babyService.createGrowthRecord(babyId, request));
    }

    @GetMapping("/babies/{id}/growth-records")
    public ApiResponse<List<GrowthRecordResponse>> getGrowthRecords(@PathVariable("id") Long babyId) {
        return ApiResponse.ok("Success", babyService.getGrowthRecords(babyId));
    }

    @GetMapping("/babies/{id}/summary")
    public ApiResponse<BabyDailySummaryResponse> getDailySummary(
            @PathVariable("id") Long babyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Success", babyService.getDailySummary(babyId, date));
    }

    @GetMapping("/babies/{id}/dashboard")
    public ApiResponse<BabyDashboardResponse> getDashboard(
            @PathVariable("id") Long babyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "trendDays", defaultValue = "7") int trendDays,
            @RequestParam(value = "recentLogLimit", defaultValue = "12") int recentLogLimit,
            @RequestParam(value = "upcomingVaccineLimit", defaultValue = "5") int upcomingVaccineLimit
    ) {
        return ApiResponse.ok("Success", babyService.getDashboard(babyId, date, trendDays, recentLogLimit, upcomingVaccineLimit));
    }

    @PostMapping("/babies/batch")
    public ApiResponse<BatchImportResponse> importBabiesBatch(@Valid @RequestBody BatchImportBabiesRequest request) {
        return ApiResponse.ok("Babies batch imported", babyService.importBabiesBatch(request));
    }
}
