package com.mom.account.controller.dto;

import jakarta.validation.constraints.NotNull;

public record UpdatePreferencesRequest(
        @NotNull UserPreferences preferences
) {
}
