package com.mom.notification.repository;

import com.mom.notification.domain.ProcessedEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedEventRepository extends JpaRepository<ProcessedEventEntity, String> {
}
