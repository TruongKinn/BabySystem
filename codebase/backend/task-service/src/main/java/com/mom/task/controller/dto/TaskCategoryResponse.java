package com.mom.task.controller.dto;

public record TaskCategoryResponse(
        Long id,
        Long familyId,
        String name,
        String colorCode
) {
}
