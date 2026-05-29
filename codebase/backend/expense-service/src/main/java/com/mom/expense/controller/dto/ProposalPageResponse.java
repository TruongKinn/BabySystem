package com.mom.expense.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalPageResponse {
    private int page;
    private int size;
    private long total;
    private List<ProposalResponse> items;
    private long pendingCount;
    private long approvedCount;
    private long rejectedCount;
}
