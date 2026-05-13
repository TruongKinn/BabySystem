package com.mom.shopping.controller.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateShoppingListRequest(
        @Pattern(regexp = ".*\\S.*", message = "name must not be blank")
        @Size(max = 160) String name,
        Boolean active
) {
}
