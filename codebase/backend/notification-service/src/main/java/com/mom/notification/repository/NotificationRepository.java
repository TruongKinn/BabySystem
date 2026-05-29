package com.mom.notification.repository;

import com.mom.notification.domain.NotificationEntity;
import com.mom.notification.domain.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId);

    List<NotificationEntity> findByFamilyIdAndUserIdOrderByCreatedAtDesc(Long familyId, Long userId);

    List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByFamilyIdAndReadAtIsNull(Long familyId);

    long countByFamilyIdAndUserIdAndReadAtIsNull(Long familyId, Long userId);

    long countByUserIdAndReadAtIsNull(Long userId);

    List<NotificationEntity> findByStatusAndScheduledAtLessThanEqual(NotificationStatus status, OffsetDateTime scheduledAt);
}
