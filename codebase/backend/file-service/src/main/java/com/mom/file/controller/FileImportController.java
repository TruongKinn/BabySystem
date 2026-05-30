package com.mom.file.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.common.context.UserContext;
import com.mom.file.controller.dto.*;
import com.mom.file.domain.FileImportHistoryEntity;
import com.mom.file.repository.FileImportHistoryRepository;
import com.mom.file.service.AsyncImportService;
import com.mom.file.service.DocumentParseService;
import com.mom.file.service.IntegrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileImportController {

    private final DocumentParseService documentParseService;
    private final IntegrationService integrationService;
    private final AsyncImportService asyncImportService;
    private final FileImportHistoryRepository fileImportHistoryRepository;

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
    public ResponseEntity<byte[]> getExcelTemplate(
            @RequestParam(value = "type", defaultValue = "expense") String type,
            @RequestParam(value = "size", required = false) Integer size
    ) {
        byte[] excelBytes = documentParseService.generateExcelTemplate(type, size);
        String suffix = size != null && size > 0 ? "_" + size + "_records" : "";
        String fileName = type.toLowerCase().trim() + suffix + "_import_template.xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    // === APIS HỖ TRỢ NHẬP EXCEL BẤT ĐỒNG BỘ (ASYNC IMPORT & HISTORY) ===

    @PostMapping(value = "/import/async", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Long> importExcelAsync(
            @RequestParam("file") MultipartFile file,
            @RequestParam("dataType") String dataType,
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "babyId", required = false) Long babyId
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File Excel rỗng hoặc không hợp lệ.");
        }

        // 1. Tạo file tạm thời trên máy chủ
        String tempDir = System.getProperty("java.io.tmpdir");
        String tempFileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        File tempFile = new File(tempDir, tempFileName);
        try {
            file.transferTo(tempFile);
        } catch (Exception e) {
            throw new IllegalStateException("Không thể lưu file Excel tạm thời trên server: " + e.getMessage(), e);
        }

        // 2. Tạo bản ghi lịch sử ban đầu với status PENDING
        FileImportHistoryEntity history = new FileImportHistoryEntity();
        history.setFileName(file.getOriginalFilename());
        history.setDataType(dataType);
        history.setStatus("PENDING");
        history.setTotalRows(0);
        history.setSuccessCount(0);
        history.setFailedCount(0);
        history.setFamilyId(familyId);
        history.setCreatedBy(UserContext.getUserId());
        FileImportHistoryEntity saved = fileImportHistoryRepository.save(history);

        // 3. Thu thập thông tin bảo mật từ UserContext để truyền sang Async Thread
        Long userId = UserContext.getUserId();
        String familyIdsHeader = "";
        List<Long> familyIds = UserContext.getFamilyIds();
        if (familyIds != null && !familyIds.isEmpty()) {
            familyIdsHeader = familyIds.stream()
                    .map(String::valueOf)
                    .reduce((left, right) -> left + "," + right)
                    .orElse("");
        }
        boolean isAdmin = UserContext.isAdmin();

        // 4. Kích hoạt Thread ngầm xử lý bất đồng bộ ngầm
        asyncImportService.executeAsyncImport(
                saved.getId(),
                tempFile.getAbsolutePath(),
                dataType,
                familyId,
                babyId,
                userId,
                familyIdsHeader,
                isAdmin
        );

        return ApiResponse.ok("Tiếp nhận tệp Excel thành công, đang ngầm xử lý...", saved.getId());
    }

    @GetMapping("/import/history")
    public ApiResponse<Page<FileImportHistoryEntity>> getImportHistory(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ApiResponse.ok("Lịch sử nhập tệp Excel", fileImportHistoryRepository.findByFamilyId(familyId, pageable));
    }

    @GetMapping("/import/history/{id}")
    public ApiResponse<FileImportHistoryEntity> getImportHistoryDetail(@PathVariable("id") Long id) {
        FileImportHistoryEntity history = fileImportHistoryRepository.findById(id)
                .orElseThrow(() -> new com.mom.common.exception.ResourceNotFoundException("Không tìm thấy lịch sử nhập tệp với ID: " + id));
        return ApiResponse.ok("Chi tiết tiến trình nhập tệp Excel", history);
    }
}
