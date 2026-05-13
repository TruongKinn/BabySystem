package com.mom.shopping.controller.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateShoppingItemCheckedRequest(
        @NotNull Boolean checked
) {
}
