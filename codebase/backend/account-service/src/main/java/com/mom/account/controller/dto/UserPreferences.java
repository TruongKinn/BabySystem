package com.mom.account.controller.dto;

public record UserPreferences(
        String theme,
        String themeAccent,
        String themeDensity,
        String themeRadius,
        String themeCustomPrimary,
        String themeCustomSecondary,
        String language,
        String currency,
        String startOfWeek,
        Boolean notificationEnabled,
        String reminderTime
) {
}
