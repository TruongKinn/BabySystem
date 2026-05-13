package com.mom.shopping.controller.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateShoppingItemRequest(
        @Pattern(regexp = ".*\\S.*", message = "itemName must not be blank")
        @Size(max = 180) String itemName,
        @Size(max = 80) String quantity,
        @Size(max = 500) String note,
        Boolean checked
) {
}
