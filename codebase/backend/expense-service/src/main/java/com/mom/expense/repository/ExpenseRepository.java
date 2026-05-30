package com.mom.expense.repository;

import com.mom.expense.domain.ExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.OffsetDateTime;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<ExpenseEntity, Long> {

    List<ExpenseEntity> findByFamilyIdOrderBySpentAtDesc(Long familyId);

    List<ExpenseEntity> findByFamilyIdAndCategoryIdOrderBySpentAtDesc(Long familyId, Long categoryId);

    List<ExpenseEntity> findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(
            Long familyId,
            OffsetDateTime from,
            OffsetDateTime to
    );

    List<ExpenseEntity> findByFamilyIdAndCategoryIdAndSpentAtBetweenOrderBySpentAtDesc(
            Long familyId,
            Long categoryId,
            OffsetDateTime from,
            OffsetDateTime to
    );

    Page<ExpenseEntity> findByFamilyIdOrderBySpentAtDesc(Long familyId, Pageable pageable);

    Page<ExpenseEntity> findByFamilyIdAndCategoryIdOrderBySpentAtDesc(Long familyId, Long categoryId, Pageable pageable);

    Page<ExpenseEntity> findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(
            Long familyId,
            OffsetDateTime from,
            OffsetDateTime to,
            Pageable pageable
    );

    Page<ExpenseEntity> findByFamilyIdAndCategoryIdAndSpentAtBetweenOrderBySpentAtDesc(
            Long familyId,
            Long categoryId,
            OffsetDateTime from,
            OffsetDateTime to,
            Pageable pageable
    );

    boolean existsByCategoryId(Long categoryId);
}

