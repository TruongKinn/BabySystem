package com.mom.task.repository;

import com.mom.task.domain.TaskEntity;
import com.mom.task.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Collection;
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

    long countByFamilyId(Long familyId);

    long countByFamilyIdAndStatus(Long familyId, TaskStatus status);

    long countByFamilyIdAndAssigneeUserIdIsNull(Long familyId);

    long countByFamilyIdAndStatusInAndDueAtBefore(Long familyId, Collection<TaskStatus> statuses, OffsetDateTime dueAt);

    long countByFamilyIdAndStatusInAndDueAtGreaterThanEqualAndDueAtLessThan(
            Long familyId,
            Collection<TaskStatus> statuses,
            OffsetDateTime start,
            OffsetDateTime end
    );
}
