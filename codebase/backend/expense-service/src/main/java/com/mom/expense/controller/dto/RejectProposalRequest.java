package com.mom.expense.controller.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectProposalRequest(
        @NotBlank String rejectReason
) {}
