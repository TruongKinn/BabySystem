package com.mom.insight.controller.dto;

import java.time.OffsetDateTime;

public record InsightExportFileResponse(
        Long id,
        Long familyId,
        String reportMonth,
        String fileName,
        String passwordMasked,
        String passwordRaw,
        String passwordAlgorithm,
        long fileSizeBytes,
        Long exportedByUserId,
        OffsetDateTime createdAt
) {
}
