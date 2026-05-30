package com.mom.shopping.controller.dto;

import java.io.Serializable;

public record ShoppingItemResponse(
        Long id,
        Long listId,
        String listName,
        Long familyId,
        String itemName,
        String quantity,
        String note,
        boolean checked
) implements Serializable {
}

