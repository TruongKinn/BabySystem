package com.mom.notification.controller.dto;

public record NotificationUnreadCountResponse(
        Long familyId,
        Long userId,
        long unreadCount
) {
}
