package com.mom.expense.repository;

import com.mom.expense.domain.BudgetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<BudgetEntity, Long> {

    Optional<BudgetEntity> findByFamilyIdAndMonthKey(Long familyId, String monthKey);

    List<BudgetEntity> findByFamilyIdOrderByMonthKeyDesc(Long familyId);
}
