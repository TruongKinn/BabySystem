package com.mom.file.service;

import com.mom.common.context.UserContext;
import com.mom.file.controller.dto.BatchImportBabiesRequest;
import com.mom.file.controller.dto.BatchImportExpensesRequest;
import com.mom.file.controller.dto.BatchImportResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegrationService {

    private final RestClient.Builder restClientBuilder;

    @Value("${BABY_SERVICE_URI:http://localhost:8087}")
    private String babyServiceUri;

    @Value("${EXPENSE_SERVICE_URI:http://localhost:8083}")
    private String expenseServiceUri;

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
