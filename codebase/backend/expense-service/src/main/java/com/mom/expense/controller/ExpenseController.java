package com.mom.expense.controller;

import com.mom.expense.controller.dto.BudgetResponse;
import com.mom.expense.controller.dto.CreateBudgetRequest;
import com.mom.expense.controller.dto.CreateExpenseCategoryRequest;
import com.mom.expense.controller.dto.CreateExpenseRequest;
import com.mom.expense.controller.dto.ExpenseCategoryReportResponse;
import com.mom.expense.controller.dto.ExpenseCategoryResponse;
import com.mom.expense.controller.dto.ExpenseDailySummaryResponse;
import com.mom.expense.controller.dto.ExpenseResponse;
import com.mom.expense.controller.dto.ExpenseSummaryResponse;
import com.mom.expense.controller.dto.UpdateBudgetRequest;
import com.mom.expense.controller.dto.UpdateExpenseRequest;
import com.mom.common.dto.ApiResponse;
import com.mom.expense.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping("/categories")
    public ApiResponse<ExpenseCategoryResponse> createCategory(@Valid @RequestBody CreateExpenseCategoryRequest request) {
        return ApiResponse.ok("Category created", expenseService.createCategory(request));
    }

    @GetMapping("/categories")
    public ApiResponse<List<ExpenseCategoryResponse>> getCategories(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", expenseService.getCategories(familyId));
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Object> deleteCategory(@PathVariable("id") Long categoryId) {
        expenseService.deleteCategory(categoryId);
        return ApiResponse.ok("Category deleted", null);
    }


    @PostMapping("/budgets")
    public ApiResponse<BudgetResponse> createBudget(@Valid @RequestBody CreateBudgetRequest request) {
        return ApiResponse.ok("Budget created", expenseService.createBudget(request));
    }

    @PutMapping("/budgets/{id}")
    public ApiResponse<BudgetResponse> updateBudget(
            @PathVariable("id") Long budgetId,
            @Valid @RequestBody UpdateBudgetRequest request
    ) {
        return ApiResponse.ok("Budget updated", expenseService.updateBudget(budgetId, request));
    }

    @GetMapping("/budgets")
    public ApiResponse<List<BudgetResponse>> getBudgets(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", expenseService.getBudgets(familyId));
    }

    @PostMapping("/expenses")
    public ApiResponse<ExpenseResponse> createExpense(@Valid @RequestBody CreateExpenseRequest request) {
        return ApiResponse.ok("Expense created", expenseService.createExpense(request));
    }

    @GetMapping("/expenses/{id}")
    public ApiResponse<ExpenseResponse> getExpense(@PathVariable("id") Long expenseId) {
        return ApiResponse.ok("Success", expenseService.getExpense(expenseId));
    }

    @GetMapping("/expenses")
    public ApiResponse<List<ExpenseResponse>> getExpenses(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "categoryId", required = false) Long categoryId
    ) {
        return ApiResponse.ok("Success", expenseService.getExpenses(familyId, month, categoryId));
    }

    @GetMapping("/expenses/summary")
    public ApiResponse<ExpenseSummaryResponse> getMonthlySummary(
            @RequestParam("familyId") Long familyId,
            @RequestParam("month") String month
    ) {
        return ApiResponse.ok("Success", expenseService.getMonthlySummary(familyId, month));
    }

    @GetMapping("/expenses/summary/daily")
    public ApiResponse<ExpenseDailySummaryResponse> getDailySummary(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Success", expenseService.getDailySummary(familyId, date));
    }

    @GetMapping("/expenses/reports/categories")
    public ApiResponse<ExpenseCategoryReportResponse> getCategoryReport(
            @RequestParam("familyId") Long familyId,
            @RequestParam("month") String month
    ) {
        return ApiResponse.ok("Success", expenseService.getCategoryReport(familyId, month));
    }

    @PutMapping("/expenses/{id}")
    public ApiResponse<ExpenseResponse> updateExpense(
            @PathVariable("id") Long expenseId,
            @Valid @RequestBody UpdateExpenseRequest request
    ) {
        return ApiResponse.ok("Expense updated", expenseService.updateExpense(expenseId, request));
    }

    @DeleteMapping("/expenses/{id}")
    public ApiResponse<Object> deleteExpense(@PathVariable("id") Long expenseId) {
        expenseService.deleteExpense(expenseId);
        return ApiResponse.ok("Expense deleted", null);
    }
}
