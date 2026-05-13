package com.mom.task.repository;

import com.mom.task.domain.TaskEntity;
import com.mom.task.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<TaskEntity, Long> {

    List<TaskEntity> findByFamilyIdOrderByDueAtAscCreatedAtDesc(Long familyId);

    List<TaskEntity> findByFamilyIdAndStatusOrderByDueAtAscCreatedAtDesc(Long familyId, TaskStatus status);

    List<TaskEntity> findByFamilyIdAndAssigneeUserIdOrderByDueAtAscCreatedAtDesc(Long familyId, Long assigneeUserId);

    List<TaskEntity> findByFamilyIdAndStatusAndAssigneeUserIdOrderByDueAtAscCreatedAtDesc(
            Long familyId,
            TaskStatus status,
            Long assigneeUserId
    );

    long countByFamilyIdAndStatus(Long familyId, TaskStatus status);
}
