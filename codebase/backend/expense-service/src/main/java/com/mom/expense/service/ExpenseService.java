package com.mom.expense.service;

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
import com.mom.expense.controller.dto.BatchImportExpensesRequest;
import com.mom.expense.controller.dto.BatchImportResponse;
import com.mom.expense.domain.BudgetEntity;
import com.mom.expense.domain.ExpenseCategoryEntity;
import com.mom.expense.domain.ExpenseEntity;
import com.mom.expense.event.ExpenseChangedPayload;
import com.mom.expense.event.ExpenseEventPublisher;
import com.mom.expense.repository.BudgetRepository;
import com.mom.expense.repository.ExpenseCategoryRepository;
import com.mom.expense.repository.ExpenseRepository;
import com.mom.expense.repository.ExpenseProposalRepository;
import com.mom.expense.domain.ExpenseProposalEntity;
import com.mom.expense.controller.dto.CreateProposalRequest;
import com.mom.expense.controller.dto.RejectProposalRequest;
import com.mom.expense.controller.dto.ResubmitProposalRequest;
import com.mom.expense.controller.dto.ProposalResponse;
import com.mom.expense.controller.dto.PageResponse;
import com.mom.expense.controller.dto.ProposalPageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.common.utils.MonthUtils;
import com.mom.common.security.DataIsolationUtil;
import com.mom.common.context.UserContext;
import org.springframework.security.access.AccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseProposalRepository expenseProposalRepository;
    private final ExpenseEventPublisher expenseEventPublisher;

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public ExpenseCategoryResponse createCategory(CreateExpenseCategoryRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());
        
        if (expenseCategoryRepository.existsByFamilyIdAndNameIgnoreCase(request.familyId(), request.name().trim())) {
            throw new IllegalArgumentException("Category name already exists in this family");
        }

        ExpenseCategoryEntity category = new ExpenseCategoryEntity();
        category.setFamilyId(request.familyId());
        category.setName(request.name().trim());
        category.setColorCode(normalizeColor(request.colorCode()));
        category.setDefaultCategory(Boolean.TRUE.equals(request.defaultCategory()));
        ExpenseCategoryEntity saved = expenseCategoryRepository.save(category);
        return toCategoryResponse(saved);
    }

    public List<ExpenseCategoryResponse> getCategories(Long familyId) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        return expenseCategoryRepository.findByFamilyIdOrderByNameAsc(familyId).stream()
                .map(this::toCategoryResponse)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public BudgetResponse createBudget(CreateBudgetRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());
        
        YearMonth month = MonthUtils.parse(request.month());

        budgetRepository.findByFamilyIdAndMonthKey(request.familyId(), MonthUtils.format(month))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Budget already exists for this month");
                });

        BudgetEntity budget = new BudgetEntity();
        budget.setFamilyId(request.familyId());
        budget.setMonthKey(MonthUtils.format(month));
        budget.setLimitAmount(request.limitAmount());

        return toBudgetResponse(budgetRepository.save(budget));
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public BudgetResponse updateBudget(Long budgetId, UpdateBudgetRequest request) {
        BudgetEntity budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found"));

        DataIsolationUtil.validateFamilyAccess(budget.getFamilyId());

        budget.setLimitAmount(request.limitAmount());
        return toBudgetResponse(budgetRepository.save(budget));
    }

    public List<BudgetResponse> getBudgets(Long familyId) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        return budgetRepository.findByFamilyIdOrderByMonthKeyDesc(familyId).stream()
                .map(this::toBudgetResponse)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public ExpenseResponse createExpense(CreateExpenseRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());
        
        ExpenseCategoryEntity category = expenseCategoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Expense category not found"));

        if (!category.getFamilyId().equals(request.familyId())) {
            throw new IllegalArgumentException("Category does not belong to this family");
        }

        ExpenseEntity expense = new ExpenseEntity();
        expense.setFamilyId(request.familyId());
        expense.setCategoryId(request.categoryId());
        expense.setAmount(request.amount());
        expense.setCurrency(request.currency().trim().toUpperCase());
        expense.setNote(trimToNull(request.note()));
        expense.setSpentAt(request.spentAt());
        ExpenseEntity saved = expenseRepository.save(expense);
        expenseEventPublisher.publishExpenseCreated(saved.getFamilyId(), toExpenseChangedPayload(saved));
        return toExpenseResponse(saved, category.getName());
    }

    public ExpenseResponse getExpense(Long expenseId) {
        ExpenseEntity expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        
        DataIsolationUtil.validateFamilyAccess(expense.getFamilyId());
        
        String categoryName = getCategoryName(expense.getCategoryId());
        return toExpenseResponse(expense, categoryName);
    }

    public List<ExpenseResponse> getExpenses(Long familyId, String month, Long categoryId) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        List<ExpenseEntity> expenses = queryExpenses(familyId, month, categoryId);
        Map<Long, String> categoryNameMap = loadCategoryNames(expenses);
        return expenses.stream()
                .map(expense -> toExpenseResponse(expense, categoryNameMap.getOrDefault(expense.getCategoryId(), "Unknown")))
                .toList();
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public ExpenseResponse updateExpense(Long expenseId, UpdateExpenseRequest request) {
        ExpenseEntity expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        DataIsolationUtil.validateFamilyAccess(expense.getFamilyId());

        if (request.categoryId() != null && !request.categoryId().equals(expense.getCategoryId())) {
            ExpenseCategoryEntity category = expenseCategoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Expense category not found"));
            if (!category.getFamilyId().equals(expense.getFamilyId())) {
                throw new IllegalArgumentException("Category does not belong to this family");
            }
            expense.setCategoryId(request.categoryId());
        }

        if (request.amount() != null) {
            expense.setAmount(request.amount());
        }
        if (request.currency() != null) {
            expense.setCurrency(request.currency().trim().toUpperCase());
        }
        if (request.note() != null) {
            expense.setNote(trimToNull(request.note()));
        }
        if (request.spentAt() != null) {
            expense.setSpentAt(request.spentAt());
        }

        ExpenseEntity saved = expenseRepository.save(expense);
        expenseEventPublisher.publishExpenseUpdated(saved.getFamilyId(), toExpenseChangedPayload(saved));
        String categoryName = getCategoryName(saved.getCategoryId());
        return toExpenseResponse(saved, categoryName);
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public void deleteExpense(Long expenseId) {
        ExpenseEntity expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        
        DataIsolationUtil.validateFamilyAccess(expense.getFamilyId());
        
        expenseRepository.delete(expense);
        expenseEventPublisher.publishExpenseDeleted(expense.getFamilyId(), toExpenseChangedPayload(expense));
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public void deleteCategory(Long categoryId) {
        ExpenseCategoryEntity category = expenseCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense category not found"));

        DataIsolationUtil.validateFamilyAccess(category.getFamilyId());

        if (category.isDefaultCategory()) {
            throw new IllegalArgumentException("Cannot delete default categories");
        }

        if (expenseRepository.existsByCategoryId(categoryId)) {
            throw new IllegalArgumentException("Cannot delete category because it has associated expenses");
        }

        expenseCategoryRepository.delete(category);
    }


    @Cacheable(value = "expense-summary", key = "#familyId + ':' + #month")
    public ExpenseSummaryResponse getMonthlySummary(Long familyId, String month) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        YearMonth yearMonth = MonthUtils.parse(month);
        OffsetDateTime from = yearMonth.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = yearMonth.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);
        
        List<ExpenseEntity> expenses = expenseRepository.findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(familyId, from, to);
        Map<Long, String> categoryNameMap = loadCategoryNames(expenses);
        Map<Long, BigDecimal> totalByCategory = buildCategoryTotals(expenses);

        BigDecimal total = sumAmounts(expenses);

        List<ExpenseSummaryResponse.CategorySummary> categorySummaries = totalByCategory.entrySet().stream()
                .map(entry -> new ExpenseSummaryResponse.CategorySummary(
                        entry.getKey(),
                        categoryNameMap.getOrDefault(entry.getKey(), "Unknown"),
                        entry.getValue()
                ))
                .sorted((left, right) -> right.totalAmount().compareTo(left.totalAmount()))
                .toList();

        return new ExpenseSummaryResponse(MonthUtils.format(yearMonth), total, categorySummaries);
    }

    public ExpenseDailySummaryResponse getDailySummary(Long familyId, LocalDate date) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        OffsetDateTime from = startOfDayUtc(targetDate);
        OffsetDateTime to = endOfDayUtc(targetDate);

        List<ExpenseEntity> expenses = expenseRepository.findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(familyId, from, to);
        Map<Long, String> categoryNameMap = loadCategoryNames(expenses);
        Map<Long, BigDecimal> totalByCategory = buildCategoryTotals(expenses);

        List<ExpenseDailySummaryResponse.CategorySummary> categorySummaries = totalByCategory.entrySet().stream()
                .map(entry -> new ExpenseDailySummaryResponse.CategorySummary(
                        entry.getKey(),
                        categoryNameMap.getOrDefault(entry.getKey(), "Unknown"),
                        entry.getValue()
                ))
                .sorted((left, right) -> right.totalAmount().compareTo(left.totalAmount()))
                .toList();

        return new ExpenseDailySummaryResponse(targetDate.toString(), sumAmounts(expenses), categorySummaries);
    }

    public ExpenseCategoryReportResponse getCategoryReport(Long familyId, String month) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        YearMonth yearMonth = MonthUtils.parse(month);
        OffsetDateTime from = yearMonth.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = yearMonth.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);

        List<ExpenseEntity> expenses = expenseRepository.findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(familyId, from, to);
        Map<Long, String> categoryNameMap = loadCategoryNames(expenses);
        Map<Long, BigDecimal> totalByCategory = buildCategoryTotals(expenses);
        Map<Long, Long> countByCategory = expenses.stream()
                .collect(Collectors.groupingBy(ExpenseEntity::getCategoryId, Collectors.counting()));

        BigDecimal total = sumAmounts(expenses);
        List<ExpenseCategoryReportResponse.CategoryReportItem> items = totalByCategory.entrySet().stream()
                .map(entry -> new ExpenseCategoryReportResponse.CategoryReportItem(
                        entry.getKey(),
                        categoryNameMap.getOrDefault(entry.getKey(), "Unknown"),
                        entry.getValue(),
                        countByCategory.getOrDefault(entry.getKey(), 0L),
                        toPercentage(entry.getValue(), total)
                ))
                .sorted((left, right) -> right.totalAmount().compareTo(left.totalAmount()))
                .toList();

        return new ExpenseCategoryReportResponse(MonthUtils.format(yearMonth), total, items);
    }

    private List<ExpenseEntity> queryExpenses(Long familyId, String month, Long categoryId) {
        if (month == null || month.isBlank()) {
            return categoryId == null
                    ? expenseRepository.findByFamilyIdOrderBySpentAtDesc(familyId)
                    : expenseRepository.findByFamilyIdAndCategoryIdOrderBySpentAtDesc(familyId, categoryId);
        }

        YearMonth yearMonth = MonthUtils.parse(month);
        OffsetDateTime from = yearMonth.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = yearMonth.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);
        return categoryId == null
                ? expenseRepository.findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(familyId, from, to)
                : expenseRepository.findByFamilyIdAndCategoryIdAndSpentAtBetweenOrderBySpentAtDesc(familyId, categoryId, from, to);
    }

    private OffsetDateTime startOfDayUtc(LocalDate date) {
        return date.atStartOfDay().atOffset(ZoneOffset.UTC);
    }

    private OffsetDateTime endOfDayUtc(LocalDate date) {
        return date.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1);
    }

    private BigDecimal sumAmounts(List<ExpenseEntity> expenses) {
        return expenses.stream()
                .map(ExpenseEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Map<Long, BigDecimal> buildCategoryTotals(List<ExpenseEntity> expenses) {
        return expenses.stream()
                .collect(Collectors.groupingBy(
                        ExpenseEntity::getCategoryId,
                        Collectors.reducing(BigDecimal.ZERO, ExpenseEntity::getAmount, BigDecimal::add)
                ));
    }

    private BigDecimal toPercentage(BigDecimal amount, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return amount.multiply(BigDecimal.valueOf(100))
                .divide(total, 2, RoundingMode.HALF_UP);
    }

    private Map<Long, String> loadCategoryNames(List<ExpenseEntity> expenses) {
        Set<Long> categoryIds = expenses.stream()
                .map(ExpenseEntity::getCategoryId)
                .collect(Collectors.toSet());
        return expenseCategoryRepository.findAllById(categoryIds).stream()
                .collect(Collectors.toMap(ExpenseCategoryEntity::getId, ExpenseCategoryEntity::getName));
    }

    private String getCategoryName(Long categoryId) {
        return expenseCategoryRepository.findById(categoryId)
                .map(ExpenseCategoryEntity::getName)
                .orElse("Unknown");
    }

    private String normalizeColor(String colorCode) {
        if (colorCode == null || colorCode.isBlank()) {
            return null;
        }
        String trimmed = colorCode.trim().toUpperCase();
        return trimmed.startsWith("#") ? trimmed : "#" + trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ExpenseCategoryResponse toCategoryResponse(ExpenseCategoryEntity category) {
        return new ExpenseCategoryResponse(
                category.getId(),
                category.getFamilyId(),
                category.getName(),
                category.getColorCode(),
                category.isDefaultCategory()
        );
    }

    private BudgetResponse toBudgetResponse(BudgetEntity budget) {
        return new BudgetResponse(
                budget.getId(),
                budget.getFamilyId(),
                budget.getMonthKey(),
                budget.getLimitAmount()
        );
    }

    private ExpenseResponse toExpenseResponse(ExpenseEntity expense, String categoryName) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getFamilyId(),
                expense.getCategoryId(),
                categoryName,
                expense.getAmount(),
                expense.getCurrency(),
                expense.getNote(),
                expense.getSpentAt()
        );
    }

    private ExpenseChangedPayload toExpenseChangedPayload(ExpenseEntity expense) {
        return new ExpenseChangedPayload(
                expense.getId(),
                expense.getFamilyId(),
                expense.getCategoryId(),
                expense.getAmount(),
                expense.getCurrency(),
                expense.getNote(),
                expense.getSpentAt()
        );
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public BatchImportResponse importExpensesBatch(BatchImportExpensesRequest request) {
        int success = 0;
        int failed = 0;
        List<BatchImportResponse.RowError> errors = new java.util.ArrayList<>();

        if (request.expenses() != null) {
            for (int i = 0; i < request.expenses().size(); i++) {
                CreateExpenseRequest req = request.expenses().get(i);
                try {
                    createExpense(req);
                    success++;
                } catch (Exception e) {
                    failed++;
                    errors.add(new BatchImportResponse.RowError(i, e.getMessage()));
                }
            }
        }

        return new BatchImportResponse(success, failed, errors);
    }

    public List<ProposalResponse> getProposals(Long familyId) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        return expenseProposalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId).stream()
                .map(this::toProposalResponse)
                .toList();
    }

    public ProposalPageResponse getProposalsPage(Long familyId, int page, int size) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        List<ExpenseProposalEntity> allProposals = expenseProposalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId);
        long pendingCount = allProposals.stream().filter(p -> "PENDING".equalsIgnoreCase(p.getStatus())).count();
        long approvedCount = allProposals.stream().filter(p -> "APPROVED".equalsIgnoreCase(p.getStatus())).count();
        long rejectedCount = allProposals.stream().filter(p -> "REJECTED".equalsIgnoreCase(p.getStatus())).count();

        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        Page<ExpenseProposalEntity> resultPage = expenseProposalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId, pageRequest);
        List<ProposalResponse> items = resultPage.getContent().stream()
                .map(this::toProposalResponse)
                .toList();

        return ProposalPageResponse.builder()
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .total(resultPage.getTotalElements())
                .items(items)
                .pendingCount(pendingCount)
                .approvedCount(approvedCount)
                .rejectedCount(rejectedCount)
                .build();
    }

    @Transactional
    public ProposalResponse createProposal(CreateProposalRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());

        if (request.proposedBy().trim().equalsIgnoreCase(request.approver().trim())) {
            throw new IllegalArgumentException("Người đề xuất không được trùng với người phê duyệt!");
        }
        
        ExpenseProposalEntity proposal = new ExpenseProposalEntity();
        proposal.setFamilyId(request.familyId());
        proposal.setTitle(request.title().trim());
        proposal.setAmount(request.amount());
        proposal.setCategoryName(request.categoryName().trim());
        proposal.setProposedBy(request.proposedBy().trim());
        proposal.setApprover(request.approver().trim());
        proposal.setStatus("PENDING");
        proposal.setCurrentStep(1);

        return toProposalResponse(expenseProposalRepository.save(proposal));
    }

    @Transactional
    @CacheEvict(value = "expense-summary", allEntries = true)
    public ProposalResponse approveProposal(Long id, String approver) {
        ExpenseProposalEntity proposal = expenseProposalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found"));
        
        DataIsolationUtil.validateFamilyAccess(proposal.getFamilyId());

        if (!UserContext.isAdmin()) {
            if (approver == null || !proposal.getApprover().trim().equalsIgnoreCase(approver.trim())) {
                throw new AccessDeniedException("Bạn không có quyền phê duyệt đề xuất này! Người duyệt được chỉ định là: " + proposal.getApprover());
            }
        }
        
        proposal.setStatus("APPROVED");
        proposal.setCurrentStep(2);
        proposal.setRejectReason(null);
        ExpenseProposalEntity savedProposal = expenseProposalRepository.save(proposal);

        // Tự động tạo một khoản chi tiêu thật tương ứng
        // Tìm hoặc tạo category có tên tương ứng
        ExpenseCategoryEntity category = expenseCategoryRepository.findByFamilyIdOrderByNameAsc(proposal.getFamilyId()).stream()
                .filter(c -> c.getName().equalsIgnoreCase(proposal.getCategoryName()))
                .findFirst()
                .orElseGet(() -> {
                    ExpenseCategoryEntity newCat = new ExpenseCategoryEntity();
                    newCat.setFamilyId(proposal.getFamilyId());
                    newCat.setName(proposal.getCategoryName());
                    newCat.setColorCode("#0F766E"); // default teal
                    newCat.setDefaultCategory(false);
                    return expenseCategoryRepository.save(newCat);
                });

        ExpenseEntity expense = new ExpenseEntity();
        expense.setFamilyId(proposal.getFamilyId());
        expense.setCategoryId(category.getId());
        expense.setAmount(proposal.getAmount());
        expense.setCurrency("VND");
        expense.setNote("[Đề xuất đã duyệt] " + proposal.getTitle());
        expense.setSpentAt(OffsetDateTime.now());
        expenseRepository.save(expense);

        return toProposalResponse(savedProposal);
    }

    @Transactional
    public ProposalResponse rejectProposal(Long id, RejectProposalRequest request, String approver) {
        ExpenseProposalEntity proposal = expenseProposalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found"));
        
        DataIsolationUtil.validateFamilyAccess(proposal.getFamilyId());

        if (!UserContext.isAdmin()) {
            if (approver == null || !proposal.getApprover().trim().equalsIgnoreCase(approver.trim())) {
                throw new AccessDeniedException("Bạn không có quyền từ chối đề xuất này! Người duyệt được chỉ định là: " + proposal.getApprover());
            }
        }
        
        proposal.setStatus("REJECTED");
        proposal.setCurrentStep(2);
        proposal.setRejectReason(request.rejectReason().trim());
        
        return toProposalResponse(expenseProposalRepository.save(proposal));
    }

    @Transactional
    public ProposalResponse resubmitProposal(Long id, ResubmitProposalRequest request, String proposer) {
        ExpenseProposalEntity proposal = expenseProposalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proposal not found"));
        
        DataIsolationUtil.validateFamilyAccess(proposal.getFamilyId());

        if (proposer == null || !proposal.getProposedBy().trim().equalsIgnoreCase(proposer.trim())) {
            throw new AccessDeniedException("Bạn không có quyền gửi lại đề xuất này! Chỉ người tạo ban đầu mới có quyền chỉnh sửa.");
        }
        
        proposal.setTitle(request.title().trim());
        proposal.setAmount(request.amount());
        proposal.setCategoryName(request.categoryName().trim());
        proposal.setApprover(request.approver().trim());
        proposal.setStatus("PENDING");
        proposal.setCurrentStep(1);
        proposal.setRejectReason(null);
        
        return toProposalResponse(expenseProposalRepository.save(proposal));
    }

    private ProposalResponse toProposalResponse(ExpenseProposalEntity proposal) {
        return new ProposalResponse(
                proposal.getId(),
                proposal.getFamilyId(),
                proposal.getTitle(),
                proposal.getAmount(),
                proposal.getCategoryName(),
                proposal.getProposedBy(),
                proposal.getApprover(),
                proposal.getStatus(),
                proposal.getRejectReason(),
                proposal.getCurrentStep(),
                proposal.getCreatedAt(),
                proposal.getUpdatedAt()
        );
    }
}
