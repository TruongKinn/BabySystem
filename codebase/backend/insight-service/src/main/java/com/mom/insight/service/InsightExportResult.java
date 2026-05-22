package com.mom.insight.service;

public record InsightExportResult(
        String fileName,
        byte[] content
) {
}
