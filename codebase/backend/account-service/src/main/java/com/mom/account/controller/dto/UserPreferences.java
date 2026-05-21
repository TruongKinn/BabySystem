package com.mom.account.controller.dto;

public record UserPreferences(
        String theme,
        String language,
        String currency,
        String startOfWeek,
        Boolean notificationEnabled,
        String reminderTime
) {
}
