import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ExpenseApi, ExpenseBudgetApi, ExpenseCategoryApi, ExpenseCategoryReportApi, ExpenseCategoryReportItemApi, ExpenseDailySummaryApi, ExpenseSummaryApi, FileMetadata, SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

interface ExpenseRecord {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  currency: string;
  note: string | null;
  spentAt: string;
}

interface CategoryInsight {
  categoryId: number;
  categoryName: string;
  colorCode: string | null;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

interface CategoryFilterOption {
  id: number;
  name: string;
  colorCode: string | null;
}

type ExpenseSortMode = 'NEWEST' | 'OLDEST' | 'HIGHEST' | 'LOWEST' | 'CATEGORY';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzToolTipModule
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
  private readonly expenseReceiptBucket = 'expense-receipts';
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  readonly sortOptions: Array<{ value: ExpenseSortMode; labelKey: string }> = [
    { value: 'NEWEST', labelKey: 'momApp.expenses.filters.sort.newest' },
    { value: 'OLDEST', labelKey: 'momApp.expenses.filters.sort.oldest' },
    { value: 'HIGHEST', labelKey: 'momApp.expenses.filters.sort.highest' },
    { value: 'LOWEST', labelKey: 'momApp.expenses.filters.sort.lowest' },
    { value: 'CATEGORY', labelKey: 'momApp.expenses.filters.sort.category' }
  ];

  loading = false;

  monthKey = this.currentMonthKey();
  selectedCategoryId: number | null = null;
  searchKeyword = '';
  sortMode: ExpenseSortMode = 'NEWEST';

  monthlySpent = 0;
  monthlyBudget = 0;
  remainingBudget = 0;
  budgetPercent = 0;
  todaySpent = 0;
  visibleSpentTotal = 0;
  averageExpense = 0;
  totalExpenseCount = 0;
  visibleExpenseCount = 0;
  activeCategoryCount = 0;
  topCategoryName = '';

  expenseRecords: ExpenseRecord[] = [];
  filteredExpenseRecords: ExpenseRecord[] = [];
  categoryInsights: CategoryInsight[] = [];
  categoryFilters: CategoryFilterOption[] = [];

  isCreateModalVisible = false;
  isSubmitting = false;
  isReceiptModalVisible = false;
  isLoadingReceipts = false;
  isUploadingReceipt = false;
  selectedExpense: ExpenseRecord | null = null;
  receiptFiles: FileMetadata[] = [];

  readonly createExpenseForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    categoryName: ['', [Validators.required, Validators.maxLength(100)]],
    note: ['', [Validators.maxLength(500)]]
  });

  ngOnInit(): void {
    this.loadExpenseWorkspace();
  }

  get budgetProgressWidth(): number {
    return Math.min(100, Math.max(0, this.budgetPercent));
  }

  get budgetStatusText(): string {
    if (this.monthlyBudget <= 0) {
      return this.i18n.translate('momApp.expenses.budgetStatus.notSet');
    }
    if (this.budgetPercent > 100) {
      return this.i18n.translate('momApp.expenses.budgetStatus.over', { percent: this.budgetPercent - 100 });
    }
    if (this.budgetPercent >= 85) {
      return this.i18n.translate('momApp.expenses.budgetStatus.warning');
    }
    return this.i18n.translate('momApp.expenses.budgetStatus.good');
  }

  get budgetStatusClass(): string {
    if (this.monthlyBudget <= 0) {
      return 'budget-neutral';
    }
    if (this.budgetPercent > 100) {
      return 'budget-danger';
    }
    if (this.budgetPercent >= 85) {
      return 'budget-warning';
    }
    return 'budget-good';
  }

  get currentCategoryLabel(): string {
    if (this.selectedCategoryId === null) {
      return this.i18n.translate('momApp.expenses.filters.allCategories');
    }
    const matched = this.categoryFilters.find((item) => item.id === this.selectedCategoryId);
    return matched?.name ?? this.i18n.translate('momApp.expenses.filters.selectedCategory');
  }

  get hasActiveQuickFilter(): boolean {
    return this.selectedCategoryId !== null || this.searchKeyword.trim().length > 0 || this.sortMode !== 'NEWEST';
  }

  loadExpenseWorkspace(): void {
    const month = this.normalizeMonthKey(this.monthKey);
    this.monthKey = month;
    this.loading = true;

    forkJoin({
      expenses: this.command.getExpenses(month, this.selectedCategoryId).pipe(catchError(() => of([] as ExpenseApi[]))),
      summary: this.command.getExpenseMonthlySummary(month).pipe(catchError(() => of(this.emptyMonthlySummary(month)))),
      daily: this.command.getExpenseDailySummary().pipe(catchError(() => of(this.emptyDailySummary()))),
      report: this.command.getExpenseCategoryReport(month).pipe(catchError(() => of(this.emptyCategoryReport(month)))),
      budgets: this.command.getExpenseBudgets().pipe(catchError(() => of([] as ExpenseBudgetApi[]))),
      categories: this.command.getExpenseCategories().pipe(catchError(() => of([] as ExpenseCategoryApi[])))
    })
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: ({ expenses, summary, daily, report, budgets, categories }) => {
          this.expenseRecords = expenses.map((item) => this.toExpenseRecord(item));

          const summaryTotal = this.toNumber(summary.totalAmount);
          const fallbackTotal = this.expenseRecords.reduce((total, item) => total + item.amount, 0);
          this.monthlySpent = summaryTotal > 0 || this.expenseRecords.length === 0 ? summaryTotal : fallbackTotal;

          this.monthlyBudget = this.resolveMonthlyBudget(budgets, month);
          this.remainingBudget = this.monthlyBudget - this.monthlySpent;
          this.budgetPercent =
            this.monthlyBudget > 0 ? Math.round((this.monthlySpent / this.monthlyBudget) * 100) : 0;
          this.todaySpent = this.toNumber(daily.totalAmount);

          this.categoryInsights = this.buildCategoryInsights(report.categories, categories, this.expenseRecords, this.monthlySpent);
          this.categoryFilters = this.buildCategoryFilters(categories, this.categoryInsights);
          this.activeCategoryCount = this.categoryInsights.filter((item) => item.totalAmount > 0).length;
          this.topCategoryName = this.categoryInsights[0]?.categoryName ?? '';
          this.totalExpenseCount = this.expenseRecords.length;

          this.applyLocalFilters();
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.expenses.messages.loadWorkspaceFailed')
          );
        }
      });
  }

  onMonthChange(rawMonth: string): void {
    const next = this.normalizeMonthKey(rawMonth);
    if (next === this.monthKey) {
      return;
    }
    this.monthKey = next;
    this.loadExpenseWorkspace();
  }

  onCategoryFilterChange(rawValue: string): void {
    const parsed = this.parseCategoryId(rawValue);
    if (parsed === this.selectedCategoryId) {
      return;
    }
    this.selectedCategoryId = parsed;
    this.loadExpenseWorkspace();
  }

  onSortModeChange(rawValue: string): void {
    if (!this.isSortMode(rawValue)) {
      return;
    }
    this.sortMode = rawValue;
    this.applyLocalFilters();
  }

  onSearchKeywordChange(rawValue: string): void {
    this.searchKeyword = rawValue;
    this.applyLocalFilters();
  }

  clearQuickFilters(): void {
    const hadServerFilter = this.selectedCategoryId !== null;
    this.selectedCategoryId = null;
    this.searchKeyword = '';
    this.sortMode = 'NEWEST';

    if (hadServerFilter) {
      this.loadExpenseWorkspace();
      return;
    }
    this.applyLocalFilters();
  }

  selectCategoryChip(categoryId: number | null): void {
    if (categoryId === this.selectedCategoryId) {
      return;
    }
    this.selectedCategoryId = categoryId;
    this.loadExpenseWorkspace();
  }

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
    this.createExpenseForm.reset({
      amount: null,
      categoryName: '',
      note: ''
    });
  }

  submitCreateExpense(): void {
    if (this.createExpenseForm.invalid) {
      this.createExpenseForm.markAllAsTouched();
      return;
    }

    const amount = Number(this.createExpenseForm.controls.amount.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.isSubmitting = true;
    this.command
      .createExpense({
        amount,
        categoryName: this.createExpenseForm.controls.categoryName.value?.trim() ?? '',
        note: this.createExpenseForm.controls.note.value?.trim() ?? '',
        currency: 'VND'
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeCreateModal();
          this.loadExpenseWorkspace();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.expenses.messages.createSuccess')
          );
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.expenses.messages.createFailed')
          );
        }
      });
  }

  openReceiptModal(expense: ExpenseRecord): void {
    this.selectedExpense = expense;
    this.isReceiptModalVisible = true;
    this.loadReceiptFiles();
  }

  closeReceiptModal(): void {
    this.isReceiptModalVisible = false;
    this.selectedExpense = null;
    this.receiptFiles = [];
  }

  onReceiptFileSelected(event: Event): void {
    if (!this.selectedExpense) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.isUploadingReceipt = true;
    this.command.uploadFile(file, this.expenseReceiptBucket, `expense:${this.selectedExpense.id}`).subscribe({
      next: () => {
        this.isUploadingReceipt = false;
        this.loadReceiptFiles();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.expenses.messages.uploadReceiptSuccess')
        );
      },
      error: (err) => {
        this.isUploadingReceipt = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.expenses.messages.uploadReceiptFailed')
        );
      }
    });
  }

  downloadReceipt(file: FileMetadata): void {
    this.command.getFileDownloadUrl(file.id).subscribe({
      next: (url) => {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener');
        }
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.expenses.messages.downloadReceiptFailed')
        );
      }
    });
  }

  deleteReceipt(file: FileMetadata): void {
    this.command.deleteFile(file.id).subscribe({
      next: () => {
        this.loadReceiptFiles();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.expenses.messages.deleteReceiptSuccess')
        );
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.expenses.messages.deleteReceiptFailed')
        );
      }
    });
  }

  formatSpentAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const locale = this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
    return date.toLocaleString(locale);
  }

  formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  trackByExpenseId(_: number, item: ExpenseRecord): number {
    return item.id;
  }

  trackByCategoryId(_: number, item: CategoryInsight): number {
    return item.categoryId;
  }

  resolveCategoryColor(categoryId: number): string {
    return this.categoryInsights.find((item) => item.categoryId === categoryId)?.colorCode || 'var(--user-primary)';
  }

  private applyLocalFilters(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();

    let filtered = [...this.expenseRecords];
    if (keyword) {
      filtered = filtered.filter((item) => {
        const haystack = `${item.categoryName} ${item.note ?? ''}`.toLowerCase();
        return haystack.includes(keyword);
      });
    }

    filtered.sort((left, right) => this.sortExpenseRecords(left, right, this.sortMode));

    this.filteredExpenseRecords = filtered;
    this.visibleExpenseCount = filtered.length;
    this.visibleSpentTotal = filtered.reduce((total, item) => total + item.amount, 0);
    this.averageExpense = filtered.length > 0 ? this.visibleSpentTotal / filtered.length : 0;
  }

  private sortExpenseRecords(left: ExpenseRecord, right: ExpenseRecord, sortMode: ExpenseSortMode): number {
    if (sortMode === 'NEWEST') {
      return right.spentAt.localeCompare(left.spentAt);
    }
    if (sortMode === 'OLDEST') {
      return left.spentAt.localeCompare(right.spentAt);
    }
    if (sortMode === 'HIGHEST') {
      return right.amount - left.amount;
    }
    if (sortMode === 'LOWEST') {
      return left.amount - right.amount;
    }

    const byCategory = left.categoryName.localeCompare(right.categoryName);
    if (byCategory !== 0) {
      return byCategory;
    }
    return right.spentAt.localeCompare(left.spentAt);
  }

  private buildCategoryInsights(
    reportItems: ExpenseCategoryReportItemApi[],
    categories: ExpenseCategoryApi[],
    expenses: ExpenseRecord[],
    monthlyTotal: number
  ): CategoryInsight[] {
    const categoryMetaById = new Map<number, ExpenseCategoryApi>();
    categories.forEach((category) => {
      categoryMetaById.set(category.id, category);
    });

    if (reportItems.length > 0) {
      return reportItems
        .map((item) => ({
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          colorCode: categoryMetaById.get(item.categoryId)?.colorCode ?? null,
          totalAmount: this.toNumber(item.totalAmount),
          expenseCount: Math.max(0, Math.trunc(this.toNumber(item.expenseCount))),
          percentage: this.toNumber(item.percentage)
        }))
        .sort((left, right) => right.totalAmount - left.totalAmount);
    }

    const byCategory = new Map<number, { name: string; total: number; count: number }>();
    for (const expense of expenses) {
      const existing = byCategory.get(expense.categoryId);
      if (existing) {
        existing.total += expense.amount;
        existing.count += 1;
        continue;
      }
      byCategory.set(expense.categoryId, {
        name: expense.categoryName,
        total: expense.amount,
        count: 1
      });
    }

    return Array.from(byCategory.entries())
      .map(([categoryId, value]) => ({
        categoryId,
        categoryName: value.name,
        colorCode: categoryMetaById.get(categoryId)?.colorCode ?? null,
        totalAmount: value.total,
        expenseCount: value.count,
        percentage: monthlyTotal > 0 ? Number(((value.total / monthlyTotal) * 100).toFixed(2)) : 0
      }))
      .sort((left, right) => right.totalAmount - left.totalAmount);
  }

  private buildCategoryFilters(categories: ExpenseCategoryApi[], insights: CategoryInsight[]): CategoryFilterOption[] {
    const optionsById = new Map<number, CategoryFilterOption>();

    for (const category of categories) {
      optionsById.set(category.id, {
        id: category.id,
        name: category.name,
        colorCode: category.colorCode ?? null
      });
    }

    for (const insight of insights) {
      if (optionsById.has(insight.categoryId)) {
        continue;
      }
      optionsById.set(insight.categoryId, {
        id: insight.categoryId,
        name: insight.categoryName,
        colorCode: insight.colorCode
      });
    }

    return Array.from(optionsById.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  private resolveMonthlyBudget(budgets: ExpenseBudgetApi[], month: string): number {
    if (budgets.length === 0) {
      return 0;
    }

    const exactBudget = budgets.find((budget) => budget.month === month);
    if (exactBudget) {
      return this.toNumber(exactBudget.limitAmount);
    }

    return this.toNumber(budgets[0].limitAmount);
  }

  private toExpenseRecord(item: ExpenseApi): ExpenseRecord {
    return {
      id: item.id,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      amount: this.toNumber(item.amount),
      currency: item.currency,
      note: item.note,
      spentAt: item.spentAt
    };
  }

  private parseCategoryId(rawValue: string): number | null {
    if (!rawValue) {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private isSortMode(value: string): value is ExpenseSortMode {
    return value === 'NEWEST' || value === 'OLDEST' || value === 'HIGHEST' || value === 'LOWEST' || value === 'CATEGORY';
  }

  private normalizeMonthKey(rawValue: string): string {
    const normalized = rawValue?.trim();
    if (normalized && /^\d{4}-\d{2}$/.test(normalized)) {
      return normalized;
    }
    return this.currentMonthKey();
  }

  private currentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private toNumber(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private emptyMonthlySummary(month: string): ExpenseSummaryApi {
    return {
      month,
      totalAmount: 0,
      byCategories: []
    };
  }

  private emptyDailySummary(): ExpenseDailySummaryApi {
    return {
      date: new Date().toISOString().slice(0, 10),
      totalAmount: 0,
      byCategories: []
    };
  }

  private emptyCategoryReport(month: string): ExpenseCategoryReportApi {
    return {
      month,
      totalAmount: 0,
      categories: []
    };
  }

  private loadReceiptFiles(): void {
    if (!this.selectedExpense) {
      return;
    }
    this.isLoadingReceipts = true;
    this.command.getFiles(this.expenseReceiptBucket, `expense:${this.selectedExpense.id}`).subscribe({
      next: (files) => {
        this.isLoadingReceipts = false;
        this.receiptFiles = files;
      },
      error: () => {
        this.isLoadingReceipts = false;
        this.receiptFiles = [];
      }
    });
  }
}
