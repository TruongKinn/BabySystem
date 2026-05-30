package com.mom.account.controller.dto;

import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;

import java.time.LocalDate;

public record FamilyMemberResponse(
        Long userId,
        String displayName,
        FamilyRole role,
        FamilyRelation relation,
        Long parentUserId,
        LocalDate dateOfBirth,
        Boolean isHost
) {
}
