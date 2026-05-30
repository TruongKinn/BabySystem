package com.mom.file.service;

import com.mom.common.context.UserContext;
import com.mom.file.controller.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final RestClient.Builder restClientBuilder;

    @Value("${BABY_SERVICE_URI:http://localhost:8087}")
    private String babyServiceUri;

    @Value("${EXPENSE_SERVICE_URI:http://localhost:8083}")
    private String expenseServiceUri;

    @Value("${SHOPPING_SERVICE_URI:http://localhost:8088}")
    private String shoppingServiceUri;

    public BatchImportResponse importExpenses(BatchImportExpensesRequest request) {
        try {
            RestClient.RequestBodySpec requestSpec = restClientBuilder.build()
                    .post()
                    .uri(expenseServiceUri + "/api/expenses/batch")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request);

            requestSpec = injectSecurityHeaders(requestSpec);

            ExpenseImportEnvelope envelope = requestSpec.retrieve().body(ExpenseImportEnvelope.class);
            if (envelope != null && envelope.success()) {
                return envelope.data();
            } else {
                String msg = envelope != null ? envelope.message() : "Unknown error";
                throw new IllegalStateException("Failed to batch import expenses: " + msg);
            }
        } catch (Exception e) {
            log.error("Error connecting to expense-service for batch import", e);
            throw new IllegalStateException("Connection to expense-service failed: " + e.getMessage(), e);
        }
    }

    public BatchImportResponse importBabies(BatchImportBabiesRequest request) {
        try {
            RestClient.RequestBodySpec requestSpec = restClientBuilder.build()
                    .post()
                    .uri(babyServiceUri + "/api/babies/batch")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request);

            requestSpec = injectSecurityHeaders(requestSpec);

            BabyImportEnvelope envelope = requestSpec.retrieve().body(BabyImportEnvelope.class);
            if (envelope != null && envelope.success()) {
                return envelope.data();
            } else {
                String msg = envelope != null ? envelope.message() : "Unknown error";
                throw new IllegalStateException("Failed to batch import babies: " + msg);
            }
        } catch (Exception e) {
            log.error("Error connecting to baby-service for batch import", e);
            throw new IllegalStateException("Connection to baby-service failed: " + e.getMessage(), e);
        }
    }

    public BatchImportResponse importShopping(BatchImportShoppingRequest request) {
        int successCount = 0;
        int failedCount = 0;
        List<BatchImportResponse.RowError> errors = new ArrayList<>();

        try {
            // 1. Tạo một danh sách mua sắm mới
            String listName = "Excel - Mua sắm [" + LocalDate.now() + "]";
            Map<String, Object> createListBody = Map.of(
                    "familyId", request.familyId(),
                    "name", listName,
                    "active", true
            );

            RestClient.RequestBodySpec listSpec = restClientBuilder.build()
                    .post()
                    .uri(shoppingServiceUri + "/api/shopping-lists")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(createListBody);

            listSpec = injectSecurityHeaders(listSpec);
            
            // Nhận kết quả ListResponse từ shopping-service
            Map<String, Object> listResponse = listSpec.retrieve().body(Map.class);
            if (listResponse == null || !Boolean.TRUE.equals(listResponse.get("success"))) {
                throw new IllegalStateException("Failed to create shopping list in shopping-service");
            }

            Map<String, Object> listData = (Map<String, Object>) listResponse.get("data");
            Long listId = ((Number) listData.get("id")).longValue();

            // 2. Thêm từng item vào danh sách mua sắm vừa tạo
            for (int i = 0; i < request.items().size(); i++) {
                BatchImportShoppingRequest.ShoppingItemDto item = request.items().get(i);
                try {
                    String quantityStr = item.quantity() != null ? String.valueOf(item.quantity().intValue()) : "1";
                    String notesStr = "Danh mục: " + item.category() + " - Đơn giá: " + (item.price() != null ? item.price().intValue() : 0);
                    if (StringUtils.hasText(item.notes())) {
                        notesStr += " - " + item.notes();
                    }

                    Map<String, Object> createItemBody = Map.of(
                            "itemName", item.name(),
                            "quantity", quantityStr,
                            "note", notesStr,
                            "checked", false
                    );

                    RestClient.RequestBodySpec itemSpec = restClientBuilder.build()
                            .post()
                            .uri(shoppingServiceUri + "/api/shopping-lists/" + listId + "/items")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(createItemBody);

                    itemSpec = injectSecurityHeaders(itemSpec);
                    Map<String, Object> itemResponse = itemSpec.retrieve().body(Map.class);
                    if (itemResponse != null && Boolean.TRUE.equals(itemResponse.get("success"))) {
                        successCount++;
                    } else {
                        failedCount++;
                        errors.add(new BatchImportResponse.RowError(i, "Failed to create item in shopping-service"));
                    }
                } catch (Exception e) {
                    log.error("Error importing shopping item index " + i, e);
                    failedCount++;
                    errors.add(new BatchImportResponse.RowError(i, e.getMessage()));
                }
            }

        } catch (Exception e) {
            log.error("Error creating shopping list for batch import", e);
            throw new IllegalStateException("Failed to batch import shopping items: " + e.getMessage(), e);
        }

        return new BatchImportResponse(successCount, failedCount, errors);
    }

    public BatchImportResponse importVaccinations(BatchImportVaccinationsRequest request) {
        int successCount = 0;
        int failedCount = 0;
        List<BatchImportResponse.RowError> errors = new ArrayList<>();

        for (int i = 0; i < request.vaccinations().size(); i++) {
            BatchImportVaccinationsRequest.VaccinationDto vaccine = request.vaccinations().get(i);
            try {
                LocalDate dueDate;
                try {
                    dueDate = LocalDate.parse(vaccine.dateStr().substring(0, 10));
                } catch (Exception e) {
                    dueDate = LocalDate.now();
                }

                String notesStr = "Mũi số: " + vaccine.shotNo() + " - Chi phí tiêm: " + (vaccine.cost() != null ? vaccine.cost().intValue() : 0);
                if (StringUtils.hasText(vaccine.location())) {
                    notesStr += " - Nơi tiêm: " + vaccine.location();
                }
                if (StringUtils.hasText(vaccine.nextDateStr())) {
                    notesStr += " - Hẹn tiếp theo: " + vaccine.nextDateStr();
                }

                Map<String, Object> createVaccineBody = Map.of(
                        "vaccineName", vaccine.vaccineName(),
                        "dueDate", dueDate.toString(),
                        "completed", true,
                        "notes", notesStr
                );

                RestClient.RequestBodySpec requestSpec = restClientBuilder.build()
                        .post()
                        .uri(babyServiceUri + "/api/babies/" + request.babyId() + "/vaccinations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(createVaccineBody);

                requestSpec = injectSecurityHeaders(requestSpec);
                Map<String, Object> response = requestSpec.retrieve().body(Map.class);
                if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                    successCount++;
                } else {
                    failedCount++;
                    errors.add(new BatchImportResponse.RowError(i, "Failed to create vaccination record"));
                }
            } catch (Exception e) {
                log.error("Error importing vaccination index " + i, e);
                failedCount++;
                errors.add(new BatchImportResponse.RowError(i, e.getMessage()));
            }
        }

        return new BatchImportResponse(successCount, failedCount, errors);
    }

    public BatchImportResponse importGrowthRecords(BatchImportGrowthRequest request) {
        int successCount = 0;
        int failedCount = 0;
        List<BatchImportResponse.RowError> errors = new ArrayList<>();

        for (int i = 0; i < request.records().size(); i++) {
            BatchImportGrowthRequest.GrowthDto record = request.records().get(i);
            try {
                LocalDate date;
                try {
                    date = LocalDate.parse(record.dateStr().substring(0, 10));
                } catch (Exception e) {
                    date = LocalDate.now();
                }

                boolean success = false;

                // 1. Tạo GrowthRecord nếu có thông tin chiều cao hoặc cân nặng
                if ((record.height() != null && record.height() > 0) || (record.weight() != null && record.weight() > 0)) {
                    BigDecimal height = record.height() != null ? BigDecimal.valueOf(record.height()) : BigDecimal.ZERO;
                    BigDecimal weight = record.weight() != null ? BigDecimal.valueOf(record.weight()) : BigDecimal.ZERO;

                    Map<String, Object> createGrowthBody = Map.of(
                            "measuredAt", date.toString(),
                            "weightKg", weight,
                            "heightCm", height,
                            "headCircumferenceCm", BigDecimal.ZERO,
                            "notes", StringUtils.hasText(record.notes()) ? record.notes() : "Nhập từ file Excel"
                    );

                    RestClient.RequestBodySpec requestSpec = restClientBuilder.build()
                            .post()
                            .uri(babyServiceUri + "/api/babies/" + request.babyId() + "/growth-records")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(createGrowthBody);

                    requestSpec = injectSecurityHeaders(requestSpec);
                    Map<String, Object> response = requestSpec.retrieve().body(Map.class);
                    if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                        success = true;
                    }
                }

                // 2. Tạo Feeding Log nếu có thông tin bữa ăn hoặc lượng ăn
                if (StringUtils.hasText(record.mealType()) || (record.intake() != null && record.intake() > 0)) {
                    BigDecimal intake = record.intake() != null ? BigDecimal.valueOf(record.intake()) : BigDecimal.ZERO;
                    
                    Map<String, Object> createLogBody = Map.of(
                            "logType", "FEEDING",
                            "value", intake,
                            "note", "Bữa ăn: " + record.mealType() + (StringUtils.hasText(record.notes()) ? " - " + record.notes() : ""),
                            "loggedAt", OffsetDateTime.now().toString()
                    );

                    RestClient.RequestBodySpec requestSpec = restClientBuilder.build()
                            .post()
                            .uri(babyServiceUri + "/api/babies/" + request.babyId() + "/logs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(createLogBody);

                    requestSpec = injectSecurityHeaders(requestSpec);
                    Map<String, Object> response = requestSpec.retrieve().body(Map.class);
                    if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                        success = true;
                    }
                }

                if (success) {
                    successCount++;
                } else {
                    failedCount++;
                    errors.add(new BatchImportResponse.RowError(i, "No valid data to import or creation failed"));
                }

            } catch (Exception e) {
                log.error("Error importing baby health index " + i, e);
                failedCount++;
                errors.add(new BatchImportResponse.RowError(i, e.getMessage()));
            }
        }

        return new BatchImportResponse(successCount, failedCount, errors);
    }

    private RestClient.RequestBodySpec injectSecurityHeaders(RestClient.RequestBodySpec spec) {
        Long userId = UserContext.getUserId();
        if (userId != null) {
            spec = spec.header("X-User-Id", String.valueOf(userId));
        }

        List<Long> familyIds = UserContext.getFamilyIds();
        if (familyIds != null && !familyIds.isEmpty()) {
            String familyIdsHeader = familyIds.stream()
                    .map(String::valueOf)
                    .reduce((left, right) -> left + "," + right)
                    .orElse("");
            if (StringUtils.hasText(familyIdsHeader)) {
                spec = spec.header("X-Family-Ids", familyIdsHeader);
            }
        }

        spec = spec.header("X-User-Admin", String.valueOf(UserContext.isAdmin()));
        return spec;
    }

    private record ExpenseImportEnvelope(
            boolean success,
            String message,
            BatchImportResponse data
    ) {}

    private record BabyImportEnvelope(
            boolean success,
            String message,
            BatchImportResponse data
    ) {}
}
