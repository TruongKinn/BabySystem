package com.mom.expense.controller.dto;

public record ExpenseCategoryResponse(
        Long id,
        Long familyId,
        String name,
        String colorCode,
        boolean defaultCategory
) {
}
