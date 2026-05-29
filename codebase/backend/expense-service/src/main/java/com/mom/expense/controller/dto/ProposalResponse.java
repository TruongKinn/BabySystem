package com.mom.expense.controller.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProposalResponse(
        Long id,
        Long familyId,
        String title,
        BigDecimal amount,
        String categoryName,
        String proposedBy,
        String approver,
        String status,
        String rejectReason,
        Integer currentStep,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
