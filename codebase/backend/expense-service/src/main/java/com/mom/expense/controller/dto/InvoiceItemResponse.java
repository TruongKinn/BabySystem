package com.mom.expense.controller.dto;

import com.mom.expense.domain.InvoiceItemEntity;
import java.math.BigDecimal;

public record InvoiceItemResponse(
        Long id,
        String name,
        BigDecimal quantity,
        BigDecimal price,
        BigDecimal tax
) {
    public static InvoiceItemResponse fromEntity(InvoiceItemEntity entity) {
        return new InvoiceItemResponse(
                entity.getId(),
                entity.getName(),
                entity.getQuantity(),
                entity.getPrice(),
                entity.getTax()
        );
    }
}
