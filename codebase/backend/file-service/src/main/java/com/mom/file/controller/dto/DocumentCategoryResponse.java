package com.mom.file.controller.dto;

import java.time.LocalDateTime;

public record DocumentCategoryResponse(
        Long id,
        Long familyId,
        String name,
        String icon,
        String color,
        LocalDateTime createdAt
) {
}
