package com.mom.notification.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.notification.controller.dto.CreateNotificationRequest;
import com.mom.notification.controller.dto.NotificationResponse;
import com.mom.notification.controller.dto.NotificationUnreadCountResponse;
import com.mom.notification.domain.NotificationStatus;
import com.mom.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/notifications")
    public ApiResponse<NotificationResponse> create(@Valid @RequestBody CreateNotificationRequest request) {
        return ApiResponse.ok("Notification requested", notificationService.create(request));
    }

    @GetMapping("/notifications")
    public ApiResponse<List<NotificationResponse>> getNotifications(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "status", required = false) NotificationStatus status
    ) {
        return ApiResponse.ok("Success", notificationService.getNotifications(familyId, userId, status));
    }

    @PostMapping("/notifications/{id}/read")
    public ApiResponse<NotificationResponse> markAsRead(@PathVariable("id") Long notificationId) {
        return ApiResponse.ok("Notification marked as read", notificationService.markAsRead(notificationId));
    }

    @GetMapping("/notifications/unread/count")
    public ApiResponse<NotificationUnreadCountResponse> unreadCount(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "userId", required = false) Long userId
    ) {
        return ApiResponse.ok("Success", notificationService.getUnreadCount(familyId, userId));
    }
}
