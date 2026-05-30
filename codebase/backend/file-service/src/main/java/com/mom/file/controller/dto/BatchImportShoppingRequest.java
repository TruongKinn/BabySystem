package com.mom.file.controller.dto;

import java.util.List;

public record BatchImportShoppingRequest(
        Long familyId,
        List<ShoppingItemDto> items
) {
    public record ShoppingItemDto(
            String name,
            String category,
            Double price,
            Double quantity,
            String priority,
            String notes
    ) {}
}
