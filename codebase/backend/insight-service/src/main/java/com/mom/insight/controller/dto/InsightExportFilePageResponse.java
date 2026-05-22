package com.mom.insight.controller.dto;

import java.util.List;

public record InsightExportFilePageResponse(
        int page,
        int size,
        long total,
        List<InsightExportFileResponse> items
) {
}
