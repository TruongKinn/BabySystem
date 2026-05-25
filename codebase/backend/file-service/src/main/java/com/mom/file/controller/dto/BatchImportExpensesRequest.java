package com.mom.file.controller.dto;

import java.util.List;

public record BatchImportExpensesRequest(
        List<CreateExpenseImportItem> expenses
) {}
