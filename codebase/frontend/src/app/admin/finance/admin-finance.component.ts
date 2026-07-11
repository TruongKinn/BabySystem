import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';
import { AuthService } from '../../auth/auth.service';
import { ExpenseApi, ExpenseBudgetApi, ExpenseSummaryApi, ExpenseProposalApi } from '../../core/services/super-app-command.service';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface FamilyMemberApi {
  userId: number;
  displayName: string;
  role: string;
  relation: string;
  isHost?: boolean;
}

interface FamilyApi {
  id: number;
  name: string;
  createdByUserId: number;
  members: FamilyMemberApi[];
}

export interface FamilyFinanceItem {
  id: number;
  name: string;
  memberCount: number;
  creatorId: number;
  creatorName: string;
  creatorAvatarUrl: string;
  monthlyBudget: number; // Tải từ /expense/budgets
  totalSpent: number;    // Tải từ /expense/expenses/summary
  remainingBudget: number;
  budgetPercent: number;
  status: 'GOOD' | 'WARNING' | 'OVER' | 'NOT_SET';
  expenses: ExpenseApi[]; // Tải từ /expense/expenses
  categoryReport: { categoryName: string; totalAmount: number }[]; // Lấy từ summary
}

@Component({
  selector: 'app-admin-finance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzInputModule,
    NzTableModule,
    NzTagModule,
    NzIconModule,
    NzToolTipModule,
    NzDrawerModule,
    NzSpinModule,
    NzAvatarModule,
    NzDatePickerModule
  ],
  templateUrl: './admin-finance.component.html',
  styleUrl: './admin-finance.component.css'
})
export class AdminFinanceComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);
  private readonly authService = inject(AuthService);

  readonly Math = Math;
  loading = false;
  searchText = '';
  monthKey: Date | null = null;

  // Dữ liệu trang hiện tại sau tổng hợp
  familiesFinance: FamilyFinanceItem[] = [];
  filteredFamilies: FamilyFinanceItem[] = [];

  // Phân trang Backend
  pageIndex = 1;
  pageSize = 10;
  total = 0;

  // Debounce search
  private readonly searchSubject = new Subject<string>();

  // Drawer xem chi tiết
  isDrawerVisible = false;
  selectedFamily: FamilyFinanceItem | null = null;

  // Quản lý đề xuất chi tiêu trong Drawer
  pendingProposals: ExpenseProposalApi[] = [];
  loadingProposals = false;
  rejectingProposalId: number | null = null;
  rejectReason = '';

  // Thống kê toàn hệ thống
  systemTotalBudget = 0;
  systemTotalSpent = 0;
  systemUsagePercent = 0;

  ngOnInit(): void {
    // Mặc định lấy tháng hiện tại
    this.monthKey = new Date();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.pageIndex = 1;
      this.loadFinanceData();
    });

    this.loadFinanceData();
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadFinanceData();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadFinanceData();
  }

  loadFinanceData(): void {
    this.loading = true;

    // Bước 1: Gọi API phân trang từ account-service
    let params = new HttpParams()
      .set('page', String(Math.max(this.pageIndex - 1, 0)))
      .set('size', String(this.pageSize));

    if (this.searchText.trim()) {
      params = params.set('searchText', this.searchText.trim());
    }

    this.http.get<ApiEnvelope<{ page: number; size: number; total: number; items: FamilyApi[] }>>(
      `${API_CONFIG.GATEWAY_URL}/account/admin/families/page`, { params }
    )
      .pipe(
        switchMap((response) => {
          const pageData = response.data;
          this.total = pageData?.total ?? 0;
          const families = pageData?.items ?? [];
          if (families.length === 0) {
            return of([]);
          }

          // Bước 2: Tạo mảng các observable để gọi song song cho từng gia đình
          const detailsObservables = families.map((family) => {
            const members = family.members ?? [];
            
            // Tìm chủ hộ thực sự (isHost = true), nếu không có thì fallback về người tạo (createdByUserId)
            const hostMember = members.find((m) => m.isHost === true);
            const selectedHostId = hostMember ? hostMember.userId : family.createdByUserId;
            
            const creator = members.find((m) => m.userId === selectedHostId);
            
            // Nếu không tìm thấy thông tin creator trong members, gọi API lấy thông tin người dùng chi tiết
            const creatorObservable = creator 
              ? of({ displayName: creator.displayName, userId: creator.userId })
              : this.http.get<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/users/${selectedHostId}`).pipe(
                  map(res => ({
                    displayName: res?.data?.displayName || res?.data?.username || `#${selectedHostId}`,
                    userId: selectedHostId
                  })),
                  catchError(() => of({ displayName: `#${selectedHostId}`, userId: selectedHostId }))
                );

            const creatorAvatarUrl = `${API_CONFIG.GATEWAY_URL}/auth/account/user/avatar/${selectedHostId}`;

            const budgetsUrl = `${API_CONFIG.GATEWAY_URL}/expense/budgets`;
            const summaryUrl = `${API_CONFIG.GATEWAY_URL}/expense/expenses/summary`;
            const expensesUrl = `${API_CONFIG.GATEWAY_URL}/expense/expenses`;

            const budgetParams = new HttpParams().set('familyId', String(family.id));
            const summaryParams = new HttpParams().set('familyId', String(family.id)).set('month', this.formatYearMonth(this.monthKey));
            const expenseParams = new HttpParams().set('familyId', String(family.id)).set('month', this.formatYearMonth(this.monthKey));

            // Gọi song song các API của mỗi gia đình (bao gồm cả API lấy thông tin creator nếu thiếu)
            return forkJoin({
              budgetsRes: this.http.get<ApiEnvelope<ExpenseBudgetApi[]>>(budgetsUrl, { params: budgetParams }).pipe(
                catchError(() => of({ success: false, message: '', data: [] as ExpenseBudgetApi[] }))
              ),
              summaryRes: this.http.get<ApiEnvelope<ExpenseSummaryApi>>(summaryUrl, { params: summaryParams }).pipe(
                catchError(() => of({ success: false, message: '', data: { month: this.formatYearMonth(this.monthKey), totalAmount: 0, byCategories: [] } as ExpenseSummaryApi }))
              ),
              expensesRes: this.http.get<ApiEnvelope<ExpenseApi[]>>(expensesUrl, { params: expenseParams }).pipe(
                catchError(() => of({ success: false, message: '', data: [] as ExpenseApi[] }))
              ),
              creatorInfo: creatorObservable
            }).pipe(
              map(({ budgetsRes, summaryRes, expensesRes, creatorInfo }) => {
                const budgets = budgetsRes.data ?? [];
                const summary = summaryRes.data ?? { month: this.formatYearMonth(this.monthKey), totalAmount: 0, byCategories: [] };
                const expenses = expensesRes.data ?? [];

                const creatorName = creatorInfo.displayName;

                // Lấy ngân sách của tháng hiện tại
                const currentBudgetRecord = budgets.find((b) => b.month === this.formatYearMonth(this.monthKey));
                const monthlyBudget = currentBudgetRecord ? currentBudgetRecord.limitAmount : 0;
                
                const totalSpent = summary.totalAmount ?? 0;
                const remainingBudget = monthlyBudget > 0 ? Math.max(monthlyBudget - totalSpent, 0) : 0;

                let budgetPercent = 0;
                let status: FamilyFinanceItem['status'] = 'NOT_SET';

                if (monthlyBudget > 0) {
                  budgetPercent = Math.round((totalSpent / monthlyBudget) * 100);
                  if (totalSpent > monthlyBudget) {
                    status = 'OVER';
                  } else if (budgetPercent >= 80) {
                    status = 'WARNING';
                  } else {
                    status = 'GOOD';
                  }
                }

                return {
                  id: family.id,
                  name: family.name,
                  memberCount: members.length,
                  creatorId: selectedHostId,
                  creatorName,
                  creatorAvatarUrl,
                  monthlyBudget,
                  totalSpent,
                  remainingBudget,
                  budgetPercent,
                  status,
                  expenses: expenses ?? [],
                  categoryReport: (summary.byCategories ?? []).map(cat => ({
                    categoryName: cat.categoryName,
                    totalAmount: cat.totalAmount
                  }))
                } as FamilyFinanceItem;
              })
            );
          });

          return forkJoin(detailsObservables);
        })
      )
      .subscribe({
        next: (results) => {
          this.familiesFinance = results;
          this.filteredFamilies = results;
          this.calculateSystemMetrics();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.familiesFinance = [];
          this.filteredFamilies = [];
          this.calculateSystemMetrics();
          this.message.error(this.i18n.translate('momApp.admin.finance.messages.loadFailed') || 'Không thể tải dữ liệu tài chính gia đình');
        }
      });
  }

  formatYearMonth(date: Date | null): string {
    if (!date) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  onMonthChange(newMonth: Date | null): void {
    if (newMonth) {
      const newMonthStr = this.formatYearMonth(newMonth);
      const currentMonthStr = this.formatYearMonth(this.monthKey);
      if (newMonthStr !== currentMonthStr) {
        this.monthKey = newMonth;
        this.pageIndex = 1;
        this.loadFinanceData();
      }
    }
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.searchSubject.next(value);
  }

  applyFilters(): void {
    this.filteredFamilies = [...this.familiesFinance];
  }

  calculateSystemMetrics(): void {
    let totalBudget = 0;
    let totalSpent = 0;

    this.familiesFinance.forEach((f) => {
      totalBudget += f.monthlyBudget;
      totalSpent += f.totalSpent;
    });

    this.systemTotalBudget = totalBudget;
    this.systemTotalSpent = totalSpent;
    this.systemUsagePercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  }

  openDrawer(family: FamilyFinanceItem): void {
    this.selectedFamily = family;
    this.isDrawerVisible = true;
    this.loadPendingProposals(family.id);
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    this.selectedFamily = null;
    this.pendingProposals = [];
    this.cancelReject();
  }

  loadPendingProposals(familyId: number): void {
    this.loadingProposals = true;
    const proposalsUrl = `${API_CONFIG.GATEWAY_URL}/expense/proposals`;
    const params = new HttpParams().set('familyId', String(familyId));
    
    this.http.get<ApiEnvelope<ExpenseProposalApi[]>>(proposalsUrl, { params })
      .pipe(
        catchError(() => of({ success: false, message: '', data: [] as ExpenseProposalApi[] }))
      )
      .subscribe({
        next: (resp) => {
          if (resp.success && resp.data) {
            this.pendingProposals = resp.data.filter(p => p.status === 'PENDING');
          } else {
            this.pendingProposals = [];
          }
          this.loadingProposals = false;
        },
        error: () => {
          this.pendingProposals = [];
          this.loadingProposals = false;
        }
      });
  }

  approveProposal(proposalId: number): void {
    const adminUsername = this.authService.getStoredItem('atg_username') || 'admin';
    const approveUrl = `${API_CONFIG.GATEWAY_URL}/expense/proposals/${proposalId}/approve`;
    const params = new HttpParams().set('approver', adminUsername);

    this.http.put<ApiEnvelope<any>>(approveUrl, {}, { params })
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.message.success(this.i18n.translate('momApp.admin.finance.messages.approveSuccess') || 'Đã phê duyệt đề xuất chi tiêu thành công');
            if (this.selectedFamily) {
              this.loadPendingProposals(this.selectedFamily.id);
              this.loadFinanceData();
            }
          } else {
            this.message.error(resp.message || 'Không thể phê duyệt đề xuất');
          }
        },
        error: (err) => {
          this.message.error(err.error?.message || 'Lỗi hệ thống khi phê duyệt đề xuất');
        }
      });
  }

  rejectProposal(proposalId: number): void {
    if (!this.rejectReason.trim()) {
      this.message.warning(this.i18n.translate('momApp.admin.finance.messages.rejectReasonRequired') || 'Vui lòng nhập lý do từ chối');
      return;
    }

    const adminUsername = this.authService.getStoredItem('atg_username') || 'admin';
    const rejectUrl = `${API_CONFIG.GATEWAY_URL}/expense/proposals/${proposalId}/reject`;
    const params = new HttpParams().set('approver', adminUsername);
    const body = { rejectReason: this.rejectReason.trim() };

    this.http.put<ApiEnvelope<any>>(rejectUrl, body, { params })
      .subscribe({
        next: (resp) => {
          if (resp.success) {
            this.message.success(this.i18n.translate('momApp.admin.finance.messages.rejectSuccess') || 'Đã từ chối đề xuất chi tiêu');
            this.rejectingProposalId = null;
            this.rejectReason = '';
            if (this.selectedFamily) {
              this.loadPendingProposals(this.selectedFamily.id);
            }
          } else {
            this.message.error(resp.message || 'Không thể từ chối đề xuất');
          }
        },
        error: (err) => {
          this.message.error(err.error?.message || 'Lỗi hệ thống khi từ chối đề xuất');
        }
      });
  }

  startReject(proposalId: number): void {
    this.rejectingProposalId = proposalId;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.rejectingProposalId = null;
    this.rejectReason = '';
  }

  formatCurrency(value: number): string {
    if (value === undefined || value === null) return '0 đ';
    return value.toLocaleString('vi-VN') + ' đ';
  }

  getPercent(amount: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.round((amount / total) * 100);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'GOOD':
        return 'status-good';
      case 'WARNING':
        return 'status-warning';
      case 'OVER':
        return 'status-over';
      default:
        return 'status-notset';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'GOOD':
        return this.i18n.translate('momApp.admin.finance.status.good');
      case 'WARNING':
        return this.i18n.translate('momApp.admin.finance.status.warning');
      case 'OVER':
        return this.i18n.translate('momApp.admin.finance.status.over');
      default:
        return this.i18n.translate('momApp.admin.finance.status.notSet');
    }
  }
}
