package com.mom.expense.controller.dto;

import java.util.List;

public record BatchImportResponse(
        int successCount,
        int failedCount,
        List<RowError> errors
) {
    public record RowError(
            int index,
            String reason
    ) {}
}
