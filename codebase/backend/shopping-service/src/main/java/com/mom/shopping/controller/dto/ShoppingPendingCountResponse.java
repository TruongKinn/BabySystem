package com.mom.shopping.controller.dto;

public record ShoppingPendingCountResponse(
        Long familyId,
        long pendingCount
) {
}
