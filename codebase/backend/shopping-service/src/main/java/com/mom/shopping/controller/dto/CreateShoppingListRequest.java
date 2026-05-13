package com.mom.shopping.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateShoppingListRequest(
        @NotNull Long familyId,
        @NotBlank @Size(max = 160) String name,
        Boolean active
) {
}
