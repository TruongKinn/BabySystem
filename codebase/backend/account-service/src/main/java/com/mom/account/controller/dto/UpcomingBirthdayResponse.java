package com.mom.account.controller.dto;

import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;

import java.time.LocalDate;

public record UpcomingBirthdayResponse(
        Long userId,
        String displayName,
        FamilyRole role,
        FamilyRelation relation,
        LocalDate dateOfBirth,
        LocalDate nextBirthday,
        long daysUntilBirthday,
        int turningAge
) {
}
