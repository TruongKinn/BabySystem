package com.mom.shopping.controller.dto;

public record ShoppingListResponse(
        Long id,
        Long familyId,
        String name,
        boolean active
) {
}
