package com.mom.insight.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.insight.controller.dto.InsightDailyResponse;
import com.mom.insight.controller.dto.InsightExportFilePageResponse;
import com.mom.insight.controller.dto.InsightExportRequest;
import com.mom.insight.controller.dto.InsightDashboardResponse;
import com.mom.insight.controller.dto.InsightMonthlyResponse;
import com.mom.insight.service.InsightExportResult;
import com.mom.insight.service.InsightExportService;
import com.mom.insight.service.InsightService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InsightController {

    private final InsightService insightService;
    private final InsightExportService insightExportService;

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

    @PostMapping(value = "/insights/monthly/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportMonthly(@Valid @RequestBody InsightExportRequest request) {
        InsightExportResult result = insightExportService.exportMonthly(request);
        ContentDisposition contentDisposition = ContentDisposition.attachment()
                .filename(result.fileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(insightExportService.xlsxContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .header("X-Export-File-Name", result.fileName())
                .contentLength(result.content().length)
                .body(result.content());
    }

    @GetMapping("/admin/export-passwords")
    public ApiResponse<InsightExportFilePageResponse> listExportPasswords(
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "familyId", required = false) Long familyId,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return ApiResponse.ok(
                "Success",
                insightExportService.listExportPasswordRecords(userId, familyId, month, page, size)
        );
    }

    @DeleteMapping("/admin/export-passwords/{id}")
    public ApiResponse<Void> deleteExportPassword(@PathVariable Long id) {
        insightExportService.deleteExportPasswordRecord(id);
        return ApiResponse.ok("Success", null);
    }
}
