package com.mom.ai.controller.dto;

import java.util.List;

public record OcrReceiptResponse(
        Long amount,
        String date,
        String category,
        String note,
        List<OcrItem> items,
        Double confidenceScore
) {
    public record OcrItem(
            String name,
            Integer quantity,
            Long price
    ) {}
}
