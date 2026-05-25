package com.mom.file.controller.dto;

import java.util.List;
import java.util.Map;

public record ExcelParseResponse(
        List<String> headers,
        List<RowData> rows,
        int totalRows
) {
    public record RowData(
            int rowNumber,
            Map<String, Object> data
    ) {}
}
