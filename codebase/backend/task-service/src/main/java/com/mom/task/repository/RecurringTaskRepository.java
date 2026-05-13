package com.mom.task.repository;

import com.mom.task.domain.RecurringTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecurringTaskRepository extends JpaRepository<RecurringTaskEntity, Long> {

    List<RecurringTaskEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId);
}
