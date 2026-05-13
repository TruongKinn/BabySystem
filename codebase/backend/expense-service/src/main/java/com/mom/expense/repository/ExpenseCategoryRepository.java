package com.mom.expense.repository;

import com.mom.expense.domain.ExpenseCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategoryEntity, Long> {

    boolean existsByFamilyIdAndNameIgnoreCase(Long familyId, String name);

    List<ExpenseCategoryEntity> findByFamilyIdOrderByNameAsc(Long familyId);
}
