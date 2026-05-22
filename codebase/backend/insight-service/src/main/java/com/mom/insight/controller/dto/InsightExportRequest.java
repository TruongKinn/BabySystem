package com.mom.insight.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record InsightExportRequest(
        @NotNull Long familyId,
        @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "must use yyyy-MM format") String month,
        @NotBlank @Size(min = 8, max = 128) String password,
        @Size(max = 16) String currency,
        @Size(max = 16) String locale,
        @Size(max = 120) String familyName
) {
}
