package com.mom.account.controller.dto;

import java.util.List;

public record FamilyResponse(
        Long id,
        String name,
        Long createdByUserId,
        List<FamilyMemberResponse> members
) {
}
