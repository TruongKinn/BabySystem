package com.mom.account.controller.dto;

import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;
import jakarta.validation.constraints.NotNull;

public record AddFamilyMemberRequest(
        @NotNull Long userId,
        @NotNull FamilyRole role,
        FamilyRelation relation,
        Long parentUserId
) {
}
