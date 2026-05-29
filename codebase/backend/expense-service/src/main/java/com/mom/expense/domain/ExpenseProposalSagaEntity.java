package com.mom.expense.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "expense_proposal_sagas")
public class ExpenseProposalSagaEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "proposal_id", nullable = false)
    private Long proposalId;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(nullable = false, length = 40)
    private String status;

    @Column(name = "current_step", nullable = false, length = 80)
    private String currentStep;

    @Column(name = "created_expense_id")
    private Long createdExpenseId;

    @Column(name = "compensation_action", length = 120)
    private String compensationAction;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
