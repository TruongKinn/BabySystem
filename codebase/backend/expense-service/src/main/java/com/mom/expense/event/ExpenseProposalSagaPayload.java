package com.mom.expense.event;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ExpenseProposalSagaPayload(
        Long proposalId,
        Long familyId,
        String title,
        BigDecimal amount,
        String categoryName,
        String proposedBy,
        String approver,
        String status,
        String action,
        String rejectReason,
        Long expenseId,
        OffsetDateTime occurredAt
) {
}
