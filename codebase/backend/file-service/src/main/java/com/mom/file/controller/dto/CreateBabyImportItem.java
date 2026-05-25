package com.mom.file.controller.dto;

import java.time.LocalDate;

public record CreateBabyImportItem(
        Long familyId,
        String name,
        LocalDate birthDate,
        String gender,
        String notes
) {}
