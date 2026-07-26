package com.mom.baby.event;

import java.time.LocalDate;

public record VaccinationReminderPayload(
        Long babyId,
        String babyName,
        Long vaccineId,
        String vaccineName,
        int doseNumber,
        LocalDate dueDate,
        Long familyId
) {
}
