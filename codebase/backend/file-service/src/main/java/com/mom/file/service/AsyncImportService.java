package com.mom.file.service;

import com.mom.file.domain.FileImportHistoryEntity;
import com.mom.file.repository.FileImportHistoryRepository;
import com.mom.file.controller.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.File;
import java.io.FileInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncImportService {

    private final FileImportHistoryRepository historyRepository;
    private final DocumentParseService documentParseService;
    private final IntegrationService integrationService;

    @Async
    public void executeAsyncImport(Long historyId, String tempFilePath, String dataType, Long familyId, Long babyId, Long userId, String familyIdsHeader, boolean isAdmin) {
        log.info("[Async Import] Bắt đầu xử lý ngầm cho History ID: {}, File: {}, Type: {}", historyId, tempFilePath, dataType);
        
        Optional<FileImportHistoryEntity> historyOpt = historyRepository.findById(historyId);
        if (historyOpt.isEmpty()) {
            log.error("[Async Import] Không tìm thấy lịch sử nhập tệp với ID: {}", historyId);
            deleteTempFile(tempFilePath);
            return;
        }

        FileImportHistoryEntity history = historyOpt.get();
        history.setStatus("PROCESSING");
        historyRepository.save(history);

        File file = new File(tempFilePath);
        if (!file.exists()) {
            updateHistoryToFailed(history, "Không tìm thấy tệp Excel tạm thời trên máy chủ.");
            return;
        }

        try (FileInputStream fis = new FileInputStream(file)) {
            // 1. Parse Excel thành danh sách Row Data
            ExcelParseResponse excelResponse = documentParseService.parseExcel(fis, history.getFileName());
            List<ExcelParseResponse.RowData> allRows = excelResponse.rows();
            
            if (allRows == null || allRows.isEmpty()) {
                updateHistoryToSuccess(history, 0, 0, "[]");
                deleteTempFile(tempFilePath);
                return;
            }

            int totalRows = allRows.size();
            history.setTotalRows(totalRows);
            historyRepository.save(history);

            log.info("[Async Import] Tìm thấy {} dòng dữ liệu hợp lệ trong file Excel", totalRows);

            int successCount = 0;
            int failedCount = 0;
            List<BatchImportResponse.RowError> allErrors = new ArrayList<>();

            // 2. Tải danh mục chi tiêu trước nếu dataType là expense
            List<Map> expenseCategories = List.of();
            if ("expense".equalsIgnoreCase(dataType)) {
                expenseCategories = integrationService.getExpenseCategories(familyId, userId, familyIdsHeader, isAdmin);
            }

            // 3. Chia nhỏ dữ liệu thành các Block nhỏ (Chunk size = 100) để import tránh timeout
            int chunkSize = 100;
            for (int i = 0; i < totalRows; i += chunkSize) {
                int end = Math.min(i + chunkSize, totalRows);
                List<ExcelParseResponse.RowData> chunk = allRows.subList(i, end);

                log.info("[Async Import] Đang xử lý block từ dòng {} đến {}", i, end - 1);

                if ("expense".equalsIgnoreCase(dataType)) {
                    List<CreateExpenseImportItem> items = new ArrayList<>();
                    for (int j = 0; j < chunk.size(); j++) {
                        ExcelParseResponse.RowData row = chunk.get(j);
                        Map<String, Object> data = row.data();

                        try {
                            String rawDate = getString(data, "Ngày chi tiêu", "spentAt", "Date", "Ngày chi");
                            OffsetDateTime spentAt;
                            try {
                                if (StringUtils.hasText(rawDate)) {
                                    // Parse date mượt mà
                                    if (rawDate.contains("T")) {
                                        spentAt = OffsetDateTime.parse(rawDate);
                                    } else {
                                        spentAt = LocalDate.parse(rawDate.substring(0, 10)).atStartOfDay().atOffset(java.time.ZoneOffset.UTC);
                                    }
                                } else {
                                    spentAt = OffsetDateTime.now();
                                }
                            } catch (Exception e) {
                                spentAt = OffsetDateTime.now();
                            }

                            String categoryName = getString(data, "Danh mục", "category", "Category");
                            Long categoryId = null;
                            if (StringUtils.hasText(categoryName) && !expenseCategories.isEmpty()) {
                                for (Map cat : expenseCategories) {
                                    String catName = (String) cat.get("name");
                                    if (catName != null && catName.trim().equalsIgnoreCase(categoryName.trim())) {
                                        categoryId = ((Number) cat.get("id")).longValue();
                                        break;
                                    }
                                }
                            }
                            if (categoryId == null && !expenseCategories.isEmpty()) {
                                categoryId = ((Number) expenseCategories.get(0).get("id")).longValue();
                            }

                            BigDecimal amount = getBigDecimal(data, "Số tiền", "amount", "Amount");
                            String note = getString(data, "Ghi chú", "note", "Note");
                            if (!StringUtils.hasText(note)) {
                                note = "Nhập từ file Excel Chi tiêu";
                            }

                            if (categoryId != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                                items.add(new CreateExpenseImportItem(familyId, categoryId, amount, "VND", note, spentAt));
                            } else {
                                allErrors.add(new BatchImportResponse.RowError(i + j, "Dòng trống hoặc Danh mục/Số tiền không hợp lệ."));
                                failedCount++;
                            }
                        } catch (Exception e) {
                            allErrors.add(new BatchImportResponse.RowError(i + j, "Lỗi phân tích dòng: " + e.getMessage()));
                            failedCount++;
                        }
                    }

                    if (!items.isEmpty()) {
                        try {
                            BatchImportResponse res = integrationService.importExpenses(new BatchImportExpensesRequest(items), userId, familyIdsHeader, isAdmin);
                            successCount += res.successCount();
                            failedCount += res.failedCount();
                            if (res.errors() != null) {
                                for (BatchImportResponse.RowError err : res.errors()) {
                                    allErrors.add(new BatchImportResponse.RowError(i + err.index(), err.reason()));
                                }
                            }
                        } catch (Exception e) {
                            log.error("Gọi expense-service batch import thất bại", e);
                            failedCount += items.size();
                            for (int k = 0; k < items.size(); k++) {
                                allErrors.add(new BatchImportResponse.RowError(i + k, "Không thể kết nối đến expense-service: " + e.getMessage()));
                            }
                        }
                    }
                } 
                else if ("shopping".equalsIgnoreCase(dataType)) {
                    List<BatchImportShoppingRequest.ShoppingItemDto> items = new ArrayList<>();
                    for (int j = 0; j < chunk.size(); j++) {
                        ExcelParseResponse.RowData row = chunk.get(j);
                        Map<String, Object> data = row.data();

                        try {
                            String name = getString(data, "Tên món đồ", "name", "Tên sản phẩm");
                            String category = getString(data, "Danh mục mua sắm", "Danh mục", "category");
                            Double price = getDouble(data, "Đơn giá dự kiến", "Đơn giá", "price");
                            Double quantity = getDouble(data, "Số lượng", "quantity");
                            String priority = getString(data, "Mức độ ưu tiên", "priority");
                            String notes = getString(data, "Ghi chú", "notes");

                            if (StringUtils.hasText(name)) {
                                items.add(new BatchImportShoppingRequest.ShoppingItemDto(name, category, price, quantity, priority, notes));
                            } else {
                                allErrors.add(new BatchImportResponse.RowError(i + j, "Tên món đồ không được để trống."));
                                failedCount++;
                            }
                        } catch (Exception e) {
                            allErrors.add(new BatchImportResponse.RowError(i + j, "Lỗi phân tích dòng: " + e.getMessage()));
                            failedCount++;
                        }
                    }

                    if (!items.isEmpty()) {
                        try {
                            BatchImportResponse res = integrationService.importShopping(new BatchImportShoppingRequest(familyId, items), userId, familyIdsHeader, isAdmin);
                            successCount += res.successCount();
                            failedCount += res.failedCount();
                            if (res.errors() != null) {
                                for (BatchImportResponse.RowError err : res.errors()) {
                                    allErrors.add(new BatchImportResponse.RowError(i + err.index(), err.reason()));
                                }
                            }
                        } catch (Exception e) {
                            log.error("Gọi shopping-service batch import thất bại", e);
                            failedCount += items.size();
                            for (int k = 0; k < items.size(); k++) {
                                allErrors.add(new BatchImportResponse.RowError(i + k, "Không thể kết nối đến shopping-service: " + e.getMessage()));
                            }
                        }
                    }
                } 
                else if ("vaccine".equalsIgnoreCase(dataType)) {
                    List<BatchImportVaccinationsRequest.VaccinationDto> items = new ArrayList<>();
                    for (int j = 0; j < chunk.size(); j++) {
                        ExcelParseResponse.RowData row = chunk.get(j);
                        Map<String, Object> data = row.data();

                        try {
                            String dateStr = getString(data, "Ngày tiêm", "dateStr", "Ngày");
                            String vaccineName = getString(data, "Tên vắc xin", "vaccineName", "Vắc xin");
                            String shotNo = getString(data, "Mũi số", "shotNo");
                            Double cost = getDouble(data, "Chi phí tiêm", "Chi phí", "cost");
                            String location = getString(data, "Cơ sở tiêm chủng", "Cơ sở tiêm", "location");
                            String nextDateStr = getString(data, "Ngày hẹn tiếp theo", "nextDateStr");

                            if (StringUtils.hasText(vaccineName)) {
                                items.add(new BatchImportVaccinationsRequest.VaccinationDto(dateStr, vaccineName, shotNo, cost, location, nextDateStr));
                            } else {
                                allErrors.add(new BatchImportResponse.RowError(i + j, "Tên vắc xin không được để trống."));
                                failedCount++;
                            }
                        } catch (Exception e) {
                            allErrors.add(new BatchImportResponse.RowError(i + j, "Lỗi phân tích dòng: " + e.getMessage()));
                            failedCount++;
                        }
                    }

                    if (!items.isEmpty()) {
                        try {
                            BatchImportResponse res = integrationService.importVaccinations(new BatchImportVaccinationsRequest(babyId, items), userId, familyIdsHeader, isAdmin);
                            successCount += res.successCount();
                            failedCount += res.failedCount();
                            if (res.errors() != null) {
                                for (BatchImportResponse.RowError err : res.errors()) {
                                    allErrors.add(new BatchImportResponse.RowError(i + err.index(), err.reason()));
                                }
                            }
                        } catch (Exception e) {
                            log.error("Gọi baby-service batch vaccinations import thất bại", e);
                            failedCount += items.size();
                            for (int k = 0; k < items.size(); k++) {
                                allErrors.add(new BatchImportResponse.RowError(i + k, "Không thể kết nối đến baby-service: " + e.getMessage()));
                            }
                        }
                    }
                } 
                else if ("baby".equalsIgnoreCase(dataType) || "baby_health".equalsIgnoreCase(dataType)) {
                    List<BatchImportGrowthRequest.GrowthDto> items = new ArrayList<>();
                    for (int j = 0; j < chunk.size(); j++) {
                        ExcelParseResponse.RowData row = chunk.get(j);
                        Map<String, Object> data = row.data();

                        try {
                            String dateStr = getString(data, "Ngày giờ", "dateStr", "Ngày");
                            String mealType = getString(data, "Loại bữa ăn", "mealType");
                            Double intake = getDouble(data, "Lượng ăn (ml/g)", "Lượng ăn", "intake");
                            Double height = getDouble(data, "Chiều cao (cm)", "Chiều cao", "height");
                            Double weight = getDouble(data, "Cân nặng (kg)", "Cân nặng", "weight");
                            String notes = getString(data, "Ghi chú y tế", "notes", "Ghi chú");

                            if (StringUtils.hasText(dateStr)) {
                                items.add(new BatchImportGrowthRequest.GrowthDto(dateStr, mealType, intake, height, weight, notes));
                            } else {
                                allErrors.add(new BatchImportResponse.RowError(i + j, "Ngày giờ đo đạc không được để trống."));
                                failedCount++;
                            }
                        } catch (Exception e) {
                            allErrors.add(new BatchImportResponse.RowError(i + j, "Lỗi phân tích dòng: " + e.getMessage()));
                            failedCount++;
                        }
                    }

                    if (!items.isEmpty()) {
                        try {
                            BatchImportResponse res = integrationService.importGrowthRecords(new BatchImportGrowthRequest(babyId, items), userId, familyIdsHeader, isAdmin);
                            successCount += res.successCount();
                            failedCount += res.failedCount();
                            if (res.errors() != null) {
                                for (BatchImportResponse.RowError err : res.errors()) {
                                    allErrors.add(new BatchImportResponse.RowError(i + err.index(), err.reason()));
                                }
                            }
                        } catch (Exception e) {
                            log.error("Gọi baby-service batch growth import thất bại", e);
                            failedCount += items.size();
                            for (int k = 0; k < items.size(); k++) {
                                allErrors.add(new BatchImportResponse.RowError(i + k, "Không thể kết nối đến baby-service: " + e.getMessage()));
                            }
                        }
                    }
                }

                // 4. Flush cập nhật tiến độ liên tục vào Database (Cực kỳ WOW khi frontend polling)
                history.setSuccessCount(successCount);
                history.setFailedCount(failedCount);
                historyRepository.save(history);
            }

            // 5. Kết thúc thành công toàn bộ
            String errorJson = serializeErrors(allErrors);
            updateHistoryToSuccess(history, successCount, failedCount, errorJson);

        } catch (Exception e) {
            log.error("[Async Import] Lỗi hệ thống nghiêm trọng trong luồng xử lý ngầm", e);
            updateHistoryToFailed(history, "Lỗi hệ thống trong tiến trình chạy ngầm: " + e.getMessage());
        } finally {
            // 6. Dọn dẹp file tạm trên ổ đĩa tránh chiếm bộ nhớ
            deleteTempFile(tempFilePath);
        }
    }

    private String getString(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                return String.valueOf(map.get(key)).trim();
            }
        }
        return "";
    }

    private Double getDouble(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                try {
                    String valStr = String.valueOf(map.get(key))
                            .replaceAll("[,\\sđVND$]", "") // Xóa dấu phẩy, khoảng trắng, đ, VND, $
                            .trim();
                    return Double.parseDouble(valStr);
                } catch (Exception e) {
                    // skip to next key
                }
            }
        }
        return 0.0;
    }

    private BigDecimal getBigDecimal(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            if (map.containsKey(key) && map.get(key) != null) {
                try {
                    String valStr = String.valueOf(map.get(key))
                            .replaceAll("[,\\sđVND$]", "") // Xóa dấu phẩy, khoảng trắng, đ, VND, $
                            .trim();
                    return new BigDecimal(valStr);
                } catch (Exception e) {
                    // skip to next key
                }
            }
        }
        return BigDecimal.ZERO;
    }

    private void updateHistoryToSuccess(FileImportHistoryEntity history, int success, int failed, String errorJson) {
        history.setStatus(success > 0 ? "SUCCESS" : "FAILED");
        history.setSuccessCount(success);
        history.setFailedCount(failed);
        history.setErrorDetails(errorJson);
        historyRepository.save(history);
        log.info("[Async Import] Hoàn tất xử lý ngầm tệp: {}. Thành công: {}, Thất bại: {}", history.getFileName(), success, failed);
    }

    private void updateHistoryToFailed(FileImportHistoryEntity history, String message) {
        history.setStatus("FAILED");
        history.setErrorDetails("[{\"index\":-1,\"reason\":\"" + message.replace("\"", "\\\"") + "\"}]");
        historyRepository.save(history);
        log.error("[Async Import] Thất bại xử lý ngầm tệp: {}. Lý do: {}", history.getFileName(), message);
    }

    private String serializeErrors(List<BatchImportResponse.RowError> errors) {
        if (errors == null || errors.isEmpty()) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < errors.size(); i++) {
            BatchImportResponse.RowError err = errors.get(i);
            sb.append(String.format("{\"index\":%d,\"reason\":\"%s\"}", err.index(), err.reason().replace("\"", "\\\"")));
            if (i < errors.size() - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private void deleteTempFile(String path) {
        try {
            File f = new File(path);
            if (f.exists()) {
                boolean deleted = f.delete();
                log.info("[Async Import] Xóa file tạm {} : {}", path, deleted ? "Thành công" : "Thất bại");
            }
        } catch (Exception e) {
            log.error("[Async Import] Không thể xóa file tạm: " + path, e);
        }
    }
}
