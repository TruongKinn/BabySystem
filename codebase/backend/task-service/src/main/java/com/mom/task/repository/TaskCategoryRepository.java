package com.mom.task.repository;

import com.mom.task.domain.TaskCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskCategoryRepository extends JpaRepository<TaskCategoryEntity, Long> {

    boolean existsByFamilyIdAndNameIgnoreCase(Long familyId, String name);

    List<TaskCategoryEntity> findByFamilyIdOrderByNameAsc(Long familyId);
}
