package com.mom.expense.controller.dto;

import java.util.List;

public record InvoicePageResponse(
        List<InvoiceResponse> items,
        long total,
        int page,
        int size
) {}
