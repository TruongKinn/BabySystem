package com.mom.expense.repository;

import com.mom.expense.domain.ExpenseProposalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

@Repository
public interface ExpenseProposalRepository extends JpaRepository<ExpenseProposalEntity, Long> {
    
    List<ExpenseProposalEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId);
    
    Page<ExpenseProposalEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId, Pageable pageable);
}
