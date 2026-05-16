package com.mom.account.controller.dto;

import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InviteFamilyMemberRequest(
        @NotBlank String username,
        @NotBlank @Email String email,
        @NotBlank String displayName,
        @NotNull FamilyRole role,
        FamilyRelation relation,
        Long parentUserId
) {
}
