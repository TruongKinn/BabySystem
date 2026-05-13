package com.mom.account.event;

public record FamilyCreatedPayload(
        Long familyId,
        String familyName,
        Long createdByUserId
) {
}
