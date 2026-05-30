package com.mom.file.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.file.controller.dto.*;
import com.mom.file.service.DocumentParseService;
import com.mom.file.service.IntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileImportController {

    private final DocumentParseService documentParseService;
    private final IntegrationService integrationService;

    @PostMapping(value = "/parse/excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ExcelParseResponse> parseExcel(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Excel file parsed successfully", documentParseService.parseExcel(file));
    }

    @PostMapping(value = "/parse/docx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DocumentParseResponse> parseDocx(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("Word DOCX file parsed successfully", documentParseService.parseDocx(file));
    }

    @PostMapping(value = "/parse/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DocumentParseResponse> parsePdf(@RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("PDF file parsed successfully", documentParseService.parsePdf(file));
    }

    @PostMapping("/import/expenses")
    public ApiResponse<BatchImportResponse> importExpenses(@RequestBody BatchImportExpensesRequest request) {
        return ApiResponse.ok("Expenses imported successfully", integrationService.importExpenses(request));
    }

    @PostMapping("/import/babies")
    public ApiResponse<BatchImportResponse> importBabies(@RequestBody BatchImportBabiesRequest request) {
        return ApiResponse.ok("Babies imported successfully", integrationService.importBabies(request));
    }

    @PostMapping("/import/shopping")
    public ApiResponse<BatchImportResponse> importShopping(@RequestBody BatchImportShoppingRequest request) {
        return ApiResponse.ok("Shopping items imported successfully", integrationService.importShopping(request));
    }

    @PostMapping("/import/vaccinations")
    public ApiResponse<BatchImportResponse> importVaccinations(@RequestBody BatchImportVaccinationsRequest request) {
        return ApiResponse.ok("Vaccinations imported successfully", integrationService.importVaccinations(request));
    }

    @PostMapping("/import/growth-records")
    public ApiResponse<BatchImportResponse> importGrowthRecords(@RequestBody BatchImportGrowthRequest request) {
        return ApiResponse.ok("Growth records imported successfully", integrationService.importGrowthRecords(request));
    }

    @GetMapping("/template/excel")
    public ResponseEntity<byte[]> getExcelTemplate(@RequestParam(value = "type", defaultValue = "expense") String type) {
        byte[] excelBytes = documentParseService.generateExcelTemplate(type);
        String fileName = type.toLowerCase().trim() + "_import_template.xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
