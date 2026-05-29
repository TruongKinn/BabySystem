package com.mom.expense.repository;

import com.mom.expense.domain.ExpenseProposalSagaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExpenseProposalSagaRepository extends JpaRepository<ExpenseProposalSagaEntity, UUID> {

    List<ExpenseProposalSagaEntity> findByProposalIdOrderByCreatedAtDesc(Long proposalId);
}
