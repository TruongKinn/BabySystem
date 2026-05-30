import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import { ExchangeRateApi, ExpenseApi, ExpenseBudgetApi, ExpenseCategoryApi, ExpenseCategoryReportApi, ExpenseCategoryReportItemApi, ExpenseDailySummaryApi, ExpenseSummaryApi, ExpenseProposalApi, ExpenseProposalPageApi, PageResponse, FamilyMemberProfile, FileMetadata, SuperAppCommandService } from '../core/services/super-app-command.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
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

export type ExpenseProposal = ExpenseProposalApi;

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
  defaultCategory: boolean;
}

type ExpenseSortMode = 'NEWEST' | 'OLDEST' | 'HIGHEST' | 'LOWEST' | 'CATEGORY';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzToolTipModule,
    NzAutocompleteModule,
    NzSelectModule,
    NzDatePickerModule,
    NzStepsModule,
    NzPaginationModule
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
  private readonly expenseReceiptBucket = 'expense-receipts';
  private readonly unlimitedMemoryFeatureKey = PREMIUM_FEATURE_KEYS.unlimitedMemory;
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly modalService = inject(NzModalService);
  private readonly userPreferences = inject(UserPreferencesService);

  /** Currency hiển thị theo cài đặt của user */
  userCurrency = this.userPreferences.getCurrency();

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

  // --- Kho Hóa đơn Phân trang (BE & FE) ---
  isExpensesListModalVisible = false;
  expensePageIndex = 1;
  expensePageSize = 10;
  expenseTotalCount = 0;

  isViewerModalVisible = false;
  selectedViewerFile: FileMetadata | null = null;
  sanitizedViewerUrl: SafeResourceUrl | SafeUrl | null = null;
  isLoadingViewer = false;
  private viewerObjectUrl: string | null = null;
  private viewerRequest: Subscription | null = null;

  // --- Family Expense Proposals ---
  isProposalModalVisible = false;
  isRejectModalVisible = false;
  isEditProposalModalVisible = false;
  selectedProposal: ExpenseProposal | null = null;
  rejectReasonText = '';

  isProposalsListModalVisible = false;
  proposalPageIndex = 1;
  proposalPageSize = 4;
  proposalTotalCount = 0;

  pendingProposalsCount = 0;
  approvedProposalsCount = 0;
  rejectedProposalsCount = 0;

  readonly proposalForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    categoryName: ['', [Validators.required]],
    approver: ['', [Validators.required]]
  });

  readonly editProposalForm = this.fb.group({
    id: [null as number | null],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    categoryName: ['', [Validators.required]],
    approver: ['', [Validators.required]]
  });

  expenseProposals: ExpenseProposal[] = [];
  familyMembers: FamilyMemberProfile[] = [];
  currentUserDisplayName = 'Mẹ (Nguyễn An)';

  readonly createExpenseForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    categoryName: ['', [Validators.required, Validators.maxLength(100)]],
    note: ['', [Validators.maxLength(500)]]
  });

  isBudgetModalVisible = false;
  isSavingBudget = false;
  allBudgets: ExpenseBudgetApi[] = [];
  currentBudgetRecordId: number | null = null;

  readonly budgetForm = this.fb.group({
    limitAmount: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  // ---- Exchange Rate (Premium) ----
  private readonly currencyExchangeFeatureKey = PREMIUM_FEATURE_KEYS.currencyExchange;
  hasExchangeRatePremium = false;
  exchangeRates: ExchangeRateApi[] = [];
  isLoadingRates = false;
  rateUpdatedAt: string | null = null;
  isExchangeRateModalVisible = false;

  convertAmount: number | null = null;
  convertFromCurrency = 'USD';
  convertResultVnd: number | null = null;
  lastConvertRate: number | null = null;
  isConverting = false;

  monthDateValue!: Date;

  updateMonthDateFromKey(): void {
    if (this.monthKey) {
      const [year, month] = this.monthKey.split('-').map(Number);
      this.monthDateValue = new Date(year, month - 1, 1);
    }
  }

  onMonthDateChange(date: Date | null): void {
    if (date) {
      this.monthDateValue = date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      this.onMonthChange(`${year}-${month}`);
    }
  }

  openExchangeRateModal(): void {
    this.isExchangeRateModalVisible = true;
    if (this.exchangeRates.length === 0) {
      this.loadExchangeRates();
    }
  }

  closeExchangeRateModal(): void {
    this.isExchangeRateModalVisible = false;
  }


  ngOnInit(): void {
    this.updateMonthDateFromKey();
    // Cập nhật currency khi user thay đổi trong Settings
    this.userPreferences.currency$.subscribe((currency) => {
      this.userCurrency = currency;
    });
    this.loadExpenseWorkspace();
    this.checkExchangeRatePremium();
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
    this.updateMonthDateFromKey();
    this.loading = true;

    forkJoin({
      expenses: this.command.getExpensesPage(month, this.selectedCategoryId, this.expensePageIndex - 1, this.expensePageSize).pipe(catchError(() => of({ page: 0, size: 10, total: 0, items: [] } as PageResponse<ExpenseApi>))),
      summary: this.command.getExpenseMonthlySummary(month).pipe(catchError(() => of(this.emptyMonthlySummary(month)))),
      daily: this.command.getExpenseDailySummary().pipe(catchError(() => of(this.emptyDailySummary()))),
      report: this.command.getExpenseCategoryReport(month).pipe(catchError(() => of(this.emptyCategoryReport(month)))),
      budgets: this.command.getExpenseBudgets().pipe(catchError(() => of([] as ExpenseBudgetApi[]))),
      categories: this.command.getExpenseCategories().pipe(catchError(() => of([] as ExpenseCategoryApi[]))),
      proposals: this.command.getExpenseProposals(this.proposalPageIndex - 1, this.proposalPageSize).pipe(
        catchError(() => of({
          page: 0,
          size: 4,
          total: 0,
          items: [],
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0
        } as ExpenseProposalPageApi))
      ),
      members: this.command.getFamilyMembersDetailed().pipe(catchError(() => of([] as FamilyMemberProfile[]))),
      profile: this.command.getProfile().pipe(catchError(() => of(null as any)))
    })
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: ({ expenses, summary, daily, report, budgets, categories, proposals, members, profile }) => {
          this.expenseRecords = expenses.items.map((item: ExpenseApi) => this.toExpenseRecord(item));
          this.expenseTotalCount = expenses.total;
          this.allBudgets = budgets;
          this.expenseProposals = proposals.items;
          this.proposalTotalCount = proposals.total;
          this.pendingProposalsCount = proposals.pendingCount;
          this.approvedProposalsCount = proposals.approvedCount;
          this.rejectedProposalsCount = proposals.rejectedCount;
          this.familyMembers = members;

          if (profile && profile.displayName) {
            const matchedMember = members.find(m => m.userId === profile.userId);
            if (matchedMember) {
              const roleMap: Record<string, string> = {
                'MOM': 'Mẹ',
                'DAD': 'Bố',
                'GRANDMA': 'Bà',
                'CAREGIVER': 'Người giúp việc',
                'ADMIN': 'Quản trị viên'
              };
              const roleText = roleMap[matchedMember.role] || matchedMember.role;
              this.currentUserDisplayName = `${roleText} (${profile.displayName})`;
            } else {
              this.currentUserDisplayName = profile.displayName;
            }
          }

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
    this.updateMonthDateFromKey();
    this.expensePageIndex = 1; // Reset pageIndex khi đổi tháng
    this.loadExpenseWorkspace();
  }

  onCategoryFilterChange(rawValue: string): void {
    const parsed = this.parseCategoryId(rawValue);
    if (parsed === this.selectedCategoryId) {
      return;
    }
    this.selectedCategoryId = parsed;
    this.expensePageIndex = 1; // Reset pageIndex khi đổi category
    if (this.isExpensesListModalVisible) {
      this.loadExpensesPage();
    } else {
      this.loadExpenseWorkspace();
    }
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

  openBudgetModal(): void {
    this.isBudgetModalVisible = true;
    const exactBudget = this.allBudgets.find((b) => b.month === this.monthKey);
    this.currentBudgetRecordId = exactBudget ? exactBudget.id : null;
    this.budgetForm.reset({
      limitAmount: exactBudget ? exactBudget.limitAmount : (this.monthlyBudget > 0 ? this.monthlyBudget : null)
    });
  }

  closeBudgetModal(): void {
    this.isBudgetModalVisible = false;
    this.currentBudgetRecordId = null;
    this.budgetForm.reset({
      limitAmount: null
    });
  }

  submitBudget(): void {
    if (this.budgetForm.invalid) {
      this.budgetForm.markAllAsTouched();
      return;
    }

    const limitAmount = Number(this.budgetForm.controls.limitAmount.value);
    if (!Number.isFinite(limitAmount) || limitAmount < 0) {
      return;
    }

    this.isSavingBudget = true;
    const request$ = this.currentBudgetRecordId
      ? this.command.updateExpenseBudget(this.currentBudgetRecordId, { limitAmount })
      : this.command.createExpenseBudget({ month: this.monthKey, limitAmount });

    request$.subscribe({
      next: () => {
        this.isSavingBudget = false;
        this.closeBudgetModal();
        this.loadExpenseWorkspace();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          'Cập nhật hạn mức ngân sách thành công'
        );
      },
      error: (err) => {
        this.isSavingBudget = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || 'Không thể cập nhật ngân sách'
        );
      }
    });
  }

  deleteCategory(categoryId: number, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa danh mục',
      nzContent: 'Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác.',
      nzOkText: 'Xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.command.deleteExpenseCategory(categoryId).subscribe({
          next: () => {
            this.notification.success(
              this.i18n.translate('momApp.common.success'),
              'Đã xóa danh mục thành công'
            );
            this.loadExpenseWorkspace();
          },
          error: (err) => {
            this.notification.error(
              this.i18n.translate('common.errorTitle'),
              err?.error?.message || err?.message || 'Không thể xóa danh mục'
            );
          }
        });
      }
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
        currency: this.userCurrency
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

  viewReceipt(file: FileMetadata): void {
    this.viewerRequest?.unsubscribe();
    this.viewerRequest = null;
    this.revokeViewerObjectUrl();
    this.selectedViewerFile = file;
    this.isViewerModalVisible = true;
    this.isLoadingViewer = true;
    this.sanitizedViewerUrl = null;
    const fileName = (file.originalFileName || '').toLowerCase();

    this.viewerRequest = this.command.getFileViewBlob(file.id)
      .pipe(finalize(() => {
        this.isLoadingViewer = false;
        this.viewerRequest = null;
      }))
      .subscribe({
        next: (blob: Blob) => {
          if (!this.isViewerModalVisible || this.selectedViewerFile?.id !== file.id || !blob || blob.size === 0) {
            return;
          }

          const viewerBlob = blob.type
            ? blob
            : blob.slice(0, blob.size, this.getViewerFallbackMimeType(fileName));
          const viewerUrl = URL.createObjectURL(viewerBlob);
          this.viewerObjectUrl = viewerUrl;
          this.sanitizedViewerUrl = fileName.endsWith('.pdf')
            ? this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl)
            : this.sanitizer.bypassSecurityTrustUrl(viewerUrl);
        },
        error: (err: any) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || 'Không thể tải tài liệu để xem trực tiếp.'
          );
        }
      });
  }

  closeViewerModal(): void {
    this.viewerRequest?.unsubscribe();
    this.viewerRequest = null;
    this.revokeViewerObjectUrl();
    this.isViewerModalVisible = false;
    this.selectedViewerFile = null;
    this.sanitizedViewerUrl = null;
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
          this.isPremiumRequired(err, this.unlimitedMemoryFeatureKey)
            ? this.i18n.translate('momApp.expenses.messages.unlimitedMemoryRequired')
            : (err?.error?.message || this.i18n.translate('momApp.expenses.messages.uploadReceiptFailed'))
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

  trackByCurrency(_: number, item: ExchangeRateApi): string {
    return item.currency;
  }

  loadExchangeRates(): void {
    this.isLoadingRates = true;
    this.command.getExchangeRates().pipe(
      catchError(() => of([] as ExchangeRateApi[])),
      finalize(() => { this.isLoadingRates = false; })
    ).subscribe((rates) => {
      this.exchangeRates = rates;
      if (rates.length > 0) {
        const locale = this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
        this.rateUpdatedAt = new Date(rates[0].updatedAt).toLocaleString(locale);
        if (!this.convertFromCurrency && rates.length > 0) {
          this.convertFromCurrency = rates[0].currency;
        }
      }
    });
  }

  doConvert(): void {
    if (!this.convertAmount || this.convertAmount <= 0 || !this.convertFromCurrency) {
      return;
    }
    this.isConverting = true;
    this.command.convertCurrencyToVnd({
      fromCurrency: this.convertFromCurrency,
      amount: this.convertAmount
    }).pipe(
      finalize(() => { this.isConverting = false; })
    ).subscribe({
      next: (result) => {
        this.convertResultVnd = result.amountVnd;
        this.lastConvertRate = result.sellRate;
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || 'Không thể thực hiện chuyển đổi. Vui lòng thử lại.'
        );
      }
    });
  }

  resolveCategoryColor(categoryId: number): string {
    return this.categoryInsights.find((item) => item.categoryId === categoryId)?.colorCode || 'var(--user-primary)';
  }

  private checkExchangeRatePremium(): void {
    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      const feature = features.find((f) => f.featureKey === this.currencyExchangeFeatureKey);
      this.hasExchangeRatePremium = feature?.enabled === true;
      if (this.hasExchangeRatePremium) {
        this.loadExchangeRates();
      }
    });
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
        colorCode: category.colorCode ?? null,
        defaultCategory: category.defaultCategory
      });
    }

    for (const insight of insights) {
      if (optionsById.has(insight.categoryId)) {
        continue;
      }
      optionsById.set(insight.categoryId, {
        id: insight.categoryId,
        name: insight.categoryName,
        colorCode: insight.colorCode,
        defaultCategory: true
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

  private getViewerFallbackMimeType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.png')) return 'image/png';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
    if (fileName.endsWith('.gif')) return 'image/gif';
    if (fileName.endsWith('.svg')) return 'image/svg+xml';
    if (fileName.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
  }

  private revokeViewerObjectUrl(): void {
    if (this.viewerObjectUrl) {
      URL.revokeObjectURL(this.viewerObjectUrl);
      this.viewerObjectUrl = null;
    }
  }

  openExpensesListModal(): void {
    this.isExpensesListModalVisible = true;
    this.expensePageIndex = 1;
    this.loadExpensesPage();
  }

  closeExpensesListModal(): void {
    this.isExpensesListModalVisible = false;
  }

  onExpensePageChange(pageIndex: number): void {
    this.expensePageIndex = pageIndex;
    this.loadExpensesPage();
  }

  loadExpensesPage(): void {
    const month = this.normalizeMonthKey(this.monthKey);
    this.loading = true;
    this.command.getExpensesPage(month, this.selectedCategoryId, this.expensePageIndex - 1, this.expensePageSize)
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (res) => {
          this.expenseRecords = res.items.map((item: ExpenseApi) => this.toExpenseRecord(item));
          this.expenseTotalCount = res.total;
          this.applyLocalFilters();
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || 'Không thể tải danh sách chi tiêu'
          );
        }
      });
  }

  openProposalsListModal(): void {
    this.isProposalsListModalVisible = true;
    this.proposalPageIndex = 1;
    this.loadExpenseProposals(0, this.proposalPageSize);
  }

  closeProposalsListModal(): void {
    this.isProposalsListModalVisible = false;
  }

  loadExpenseProposals(page: number, size: number): void {
    this.command.getExpenseProposals(page, size).subscribe({
      next: (res) => {
        this.expenseProposals = res.items;
        this.proposalTotalCount = res.total;
        this.pendingProposalsCount = res.pendingCount;
        this.approvedProposalsCount = res.approvedCount;
        this.rejectedProposalsCount = res.rejectedCount;
      }
    });
  }

  onProposalPageChange(pageIndex: number): void {
    this.proposalPageIndex = pageIndex;
    this.loadExpenseProposals(pageIndex - 1, this.proposalPageSize);
  }

  openProposalModalFromList(): void {
    this.openProposalModal();
  }

  openProposalModal(): void {
    this.isProposalModalVisible = true;
    this.proposalForm.reset({
      title: '',
      amount: null,
      categoryName: '',
      approver: ''
    });
  }

  closeProposalModal(): void {
    this.isProposalModalVisible = false;
  }

  submitProposal(): void {
    if (this.proposalForm.invalid) {
      this.proposalForm.markAllAsTouched();
      return;
    }

    const value = this.proposalForm.value;
    this.isSubmitting = true;
    this.command.createExpenseProposal({
      title: value.title ?? '',
      amount: Number(value.amount),
      categoryName: value.categoryName ?? '',
      proposedBy: this.currentUserDisplayName,
      approver: value.approver ?? ''
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeProposalModal();
        this.loadExpenseWorkspace();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('app.expenses.proposals.modal.successCreate')
        );

        // Bắn thông báo cho người duyệt vào quả chuông
        const selectedMember = this.familyMembers.find(m => {
          const key = `${m.role === 'MOM' ? 'Mẹ' : (m.role === 'DAD' ? 'Bố' : (m.role === 'GRANDMA' ? 'Bà' : (m.role === 'CAREGIVER' ? 'Người giúp việc' : 'Thành viên')))} (${m.displayName})`;
          return key === value.approver;
        });
        const approverUserId = selectedMember ? selectedMember.userId : null;
        this.command.createNotification({
          userId: approverUserId,
          title: 'Đề xuất chi tiêu mới cần duyệt 💰',
          message: `${this.currentUserDisplayName} đã gửi một đề xuất chi tiêu mới: "${value.title}" với số tiền là ${Number(value.amount).toLocaleString('vi-VN')} VND. Vui lòng vào xem và phê duyệt!`,
          type: 'EXPENSE'
        }).subscribe({
          error: (e) => console.error('Failed to send proposal notification', e)
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || 'Không thể gửi đề xuất chi tiêu'
        );
      }
    });
  }

  approveProposal(proposal: ExpenseProposal): void {
    this.command.approveExpenseProposal(proposal.id, this.currentUserDisplayName).subscribe({
      next: () => {
        this.loadExpenseWorkspace();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('app.expenses.proposals.modal.successApprove')
        );
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || 'Không thể duyệt đề xuất'
        );
      }
    });
  }

  openRejectModal(proposal: ExpenseProposal): void {
    this.selectedProposal = proposal;
    this.rejectReasonText = '';
    this.isRejectModalVisible = true;
  }

  closeRejectModal(): void {
    this.isRejectModalVisible = false;
    this.selectedProposal = null;
    this.rejectReasonText = '';
  }

  submitReject(): void {
    if (!this.rejectReasonText.trim()) {
      this.notification.warning('Cảnh báo', 'Vui lòng nhập lý do từ chối');
      return;
    }

    if (this.selectedProposal) {
      this.command.rejectExpenseProposal(this.selectedProposal.id, this.rejectReasonText, this.currentUserDisplayName).subscribe({
        next: () => {
          this.closeRejectModal();
          this.loadExpenseWorkspace();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('app.expenses.proposals.modal.successReject')
          );
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || 'Không thể từ chối đề xuất'
          );
        }
      });
    }
  }

  openEditProposalModal(proposal: ExpenseProposal): void {
    this.selectedProposal = proposal;
    this.editProposalForm.reset({
      id: proposal.id,
      title: proposal.title,
      amount: proposal.amount,
      categoryName: proposal.categoryName,
      approver: proposal.approver
    });
    this.isEditProposalModalVisible = true;
  }

  closeEditProposalModal(): void {
    this.isEditProposalModalVisible = false;
    this.selectedProposal = null;
  }

  submitEditProposal(): void {
    if (this.editProposalForm.invalid) {
      this.editProposalForm.markAllAsTouched();
      return;
    }

    const value = this.editProposalForm.value;
    if (value.id) {
      this.isSubmitting = true;
      this.command.resubmitExpenseProposal(value.id, {
        title: value.title ?? '',
        amount: Number(value.amount),
        categoryName: value.categoryName ?? '',
        approver: value.approver ?? ''
      }, this.currentUserDisplayName).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeEditProposalModal();
          this.loadExpenseWorkspace();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('app.expenses.proposals.modal.successResubmit')
          );

          // Bắn thông báo cho người duyệt khi đề xuất được gửi lại
          const selectedMember = this.familyMembers.find(m => {
            const key = `${m.role === 'MOM' ? 'Mẹ' : (m.role === 'DAD' ? 'Bố' : (m.role === 'GRANDMA' ? 'Bà' : (m.role === 'CAREGIVER' ? 'Người giúp việc' : 'Thành viên')))} (${m.displayName})`;
            return key === value.approver;
          });
          const approverUserId = selectedMember ? selectedMember.userId : null;
          this.command.createNotification({
            userId: approverUserId,
            title: 'Đề xuất chi tiêu được gửi lại 🔄',
            message: `${this.currentUserDisplayName} đã chỉnh sửa và gửi lại đề xuất chi tiêu: "${value.title}" với số tiền là ${Number(value.amount).toLocaleString('vi-VN')} VND. Vui lòng vào phê duyệt!`,
            type: 'EXPENSE'
          }).subscribe({
            error: (e) => console.error('Failed to send proposal notification', e)
          });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || 'Không thể gửi lại đề xuất'
          );
        }
      });
    }
  }

  private isPremiumRequired(err: any, featureKey: string): boolean {
    const message = String(err?.message ?? '');
    return message.includes(`PREMIUM_REQUIRED:${featureKey}`);
  }
}
