package com.mom.account.controller.dto;

import java.time.LocalDate;

public record FamilyQuestStateResponse(
        Long familyId,
        LocalDate lastClaimDate,
        int streakDays,
        int totalPoints,
        boolean claimedToday
) {
}
