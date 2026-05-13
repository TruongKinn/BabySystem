package com.mom.shopping.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateShoppingItemRequest(
        @NotBlank @Size(max = 180) String itemName,
        @Size(max = 80) String quantity,
        @Size(max = 500) String note,
        Boolean checked
) {
}
