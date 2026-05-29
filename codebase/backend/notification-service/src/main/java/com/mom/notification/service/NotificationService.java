package com.mom.notification.service;

import com.mom.common.exception.ResourceNotFoundException;
import com.mom.notification.controller.dto.CreateNotificationRequest;
import com.mom.notification.controller.dto.NotificationResponse;
import com.mom.notification.controller.dto.NotificationUnreadCountResponse;
import com.mom.notification.domain.NotificationChannel;
import com.mom.notification.domain.NotificationEntity;
import com.mom.notification.domain.NotificationStatus;
import com.mom.notification.domain.NotificationType;
import com.mom.notification.event.NotificationRequestedPayload;
import com.mom.notification.premium.PremiumFeatures;
import com.mom.notification.repository.NotificationRepository;
import com.mom.common.security.DataIsolationUtil;
import com.mom.common.context.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final PremiumAccessService premiumAccessService;

    @Transactional
    public NotificationResponse create(CreateNotificationRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());
        NotificationType resolvedType = request.type() != null ? request.type() : NotificationType.REMINDER;
        if (resolvedType == NotificationType.REMINDER) {
            premiumAccessService.requireFeature(request.familyId(), PremiumFeatures.SMART_REMINDERS);
        }

        NotificationEntity entity = new NotificationEntity();
        entity.setFamilyId(request.familyId());
        entity.setUserId(request.userId());
        entity.setChannel(request.channel() != null ? request.channel() : NotificationChannel.PUSH);
        entity.setType(resolvedType);
        entity.setTitle(request.title().trim());
        entity.setMessage(request.message().trim());
        entity.setMetadataJson(trimToNull(request.metadataJson()));
        entity.setScheduledAt(request.scheduledAt() != null ? request.scheduledAt() : OffsetDateTime.now());
        entity.setStatus(NotificationStatus.PENDING);
        return toResponse(notificationRepository.save(entity));
    }

    @Transactional
    public NotificationResponse createFromEvent(Long familyId, Long userId, NotificationRequestedPayload payload) {
        if (familyId == null) {
            throw new IllegalArgumentException("familyId is required in notification event");
        }
        if (payload.message() == null || payload.message().isBlank()) {
            throw new IllegalArgumentException("message is required in notification event");
        }

        NotificationEntity entity = new NotificationEntity();
        entity.setFamilyId(familyId);
        entity.setUserId(userId);
        entity.setChannel(parseChannel(payload.channel()));
        entity.setType(parseType(payload.type()));
        entity.setTitle(defaultTitle(payload.title()));
        entity.setMessage(payload.message().trim());
        entity.setMetadataJson(trimToNull(payload.metadataJson()));
        entity.setScheduledAt(payload.scheduledAt() != null ? payload.scheduledAt() : OffsetDateTime.now());
        entity.setStatus(NotificationStatus.PENDING);
        return toResponse(notificationRepository.save(entity));
    }

    public List<NotificationResponse> getNotifications(Long familyId, Long userId, NotificationStatus status) {
        if (userId != null && userId.equals(UserContext.getUserId())) {
            List<Long> myFamilyIds = UserContext.getFamilyIds();
            if (myFamilyIds != null && !myFamilyIds.isEmpty()) {
                List<NotificationEntity> entities = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
                return entities.stream()
                        .filter(entity -> myFamilyIds.contains(entity.getFamilyId()))
                        .filter(entity -> status == null || entity.getStatus() == status)
                        .map(this::toResponse)
                        .toList();
            }
        }

        DataIsolationUtil.validateFamilyAccess(familyId);

        List<NotificationEntity> entities = userId == null
                ? notificationRepository.findByFamilyIdOrderByCreatedAtDesc(familyId)
                : notificationRepository.findByFamilyIdAndUserIdOrderByCreatedAtDesc(familyId, userId);

        return entities.stream()
                .filter(entity -> status == null || entity.getStatus() == status)
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId) {
        NotificationEntity entity = getEntity(notificationId);
        if (entity.getReadAt() == null) {
            entity.setReadAt(OffsetDateTime.now());
        }
        return toResponse(notificationRepository.save(entity));
    }

    public NotificationUnreadCountResponse getUnreadCount(Long familyId, Long userId) {
        if (userId != null && userId.equals(UserContext.getUserId())) {
            List<Long> myFamilyIds = UserContext.getFamilyIds();
            if (myFamilyIds != null && !myFamilyIds.isEmpty()) {
                long count = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                        .filter(entity -> myFamilyIds.contains(entity.getFamilyId()))
                        .filter(entity -> entity.getReadAt() == null)
                        .count();
                return new NotificationUnreadCountResponse(familyId, userId, count);
            }
        }

        DataIsolationUtil.validateFamilyAccess(familyId);

        long count = userId == null
                ? notificationRepository.countByFamilyIdAndReadAtIsNull(familyId)
                : notificationRepository.countByFamilyIdAndUserIdAndReadAtIsNull(familyId, userId);
        return new NotificationUnreadCountResponse(familyId, userId, count);
    }

    @Scheduled(fixedDelayString = "${notification.dispatch.fixed-delay-ms:30000}")
    @Transactional
    public void dispatchDueNotifications() {
        OffsetDateTime now = OffsetDateTime.now();
        List<NotificationEntity> dueNotifications = notificationRepository
                .findByStatusAndScheduledAtLessThanEqual(NotificationStatus.PENDING, now);

        if (dueNotifications.isEmpty()) {
            return;
        }

        dueNotifications.forEach(notification -> {
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(now);
            
            // Push via WebSocket
            try {
                String destination = "/topic/notifications/user/" + notification.getUserId();
                messagingTemplate.convertAndSend(destination, toResponse(notification));
            } catch (Exception e) {
                log.error("Failed to push notification via WebSocket: {}", e.getMessage());
            }
        });
        notificationRepository.saveAll(dueNotifications);
        log.info("Dispatched {} notifications", dueNotifications.size());
    }

    private NotificationEntity getEntity(Long notificationId) {
        NotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        DataIsolationUtil.validateFamilyAccess(entity.getFamilyId());
        return entity;
    }

    private NotificationResponse toResponse(NotificationEntity entity) {
        return new NotificationResponse(
                entity.getId(),
                entity.getFamilyId(),
                entity.getUserId(),
                entity.getChannel(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getMetadataJson(),
                entity.getScheduledAt(),
                entity.getSentAt(),
                entity.getReadAt(),
                entity.getStatus(),
                entity.getErrorMessage(),
                entity.getCreatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private NotificationChannel parseChannel(String value) {
        if (value == null || value.isBlank()) {
            return NotificationChannel.PUSH;
        }
        try {
            return NotificationChannel.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return NotificationChannel.PUSH;
        }
    }

    private NotificationType parseType(String value) {
        if (value == null || value.isBlank()) {
            return NotificationType.REMINDER;
        }
        try {
            return NotificationType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return NotificationType.REMINDER;
        }
    }

    private String defaultTitle(String title) {
        if (title == null || title.isBlank()) {
            return "Reminder";
        }
        return title.trim();
    }
}
