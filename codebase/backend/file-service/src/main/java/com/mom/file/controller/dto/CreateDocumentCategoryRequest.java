package com.mom.file.controller.dto;

public record CreateDocumentCategoryRequest(
        Long familyId,
        String name,
        String icon,
        String color
) {
}
