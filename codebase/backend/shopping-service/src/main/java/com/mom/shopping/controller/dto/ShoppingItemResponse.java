package com.mom.shopping.controller.dto;

public record ShoppingItemResponse(
        Long id,
        Long listId,
        String listName,
        Long familyId,
        String itemName,
        String quantity,
        String note,
        boolean checked
) {
}
