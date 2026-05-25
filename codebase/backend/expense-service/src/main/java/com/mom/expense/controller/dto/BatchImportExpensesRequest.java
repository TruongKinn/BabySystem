package com.mom.expense.controller.dto;

import java.util.List;

public record BatchImportExpensesRequest(
        List<CreateExpenseRequest> expenses
) {
}
