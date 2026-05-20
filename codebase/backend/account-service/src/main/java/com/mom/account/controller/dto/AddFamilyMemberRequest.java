package com.mom.account.controller.dto;

import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record AddFamilyMemberRequest(
        @NotNull Long userId,
        @NotNull FamilyRole role,
        FamilyRelation relation,
        Long parentUserId,
        LocalDate dateOfBirth
) {
}
