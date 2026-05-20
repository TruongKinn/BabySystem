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
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';
import { AuthService } from '../../auth/auth.service';
import { ExpenseApi, ExpenseBudgetApi, ExpenseSummaryApi } from '../../core/services/super-app-command.service';

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
  creatorName: string;
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
    NzAvatarModule
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
  monthKey = ''; // YYYY-MM
  
  // Danh sách đầy đủ sau tổng hợp
  familiesFinance: FamilyFinanceItem[] = [];
  filteredFamilies: FamilyFinanceItem[] = [];

  // Drawer xem chi tiết
  isDrawerVisible = false;
  selectedFamily: FamilyFinanceItem | null = null;

  // Thống kê toàn hệ thống
  systemTotalBudget = 0;
  systemTotalSpent = 0;
  systemUsagePercent = 0;

  ngOnInit(): void {
    // Mặc định lấy tháng hiện tại (ví dụ: "2026-05")
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    this.monthKey = `${year}-${month}`;
    this.loadFinanceData();
  }

  loadFinanceData(): void {
    this.loading = true;
    
    // Bước 1: Lấy danh sách các gia đình từ account-service
    this.http.get<ApiEnvelope<FamilyApi[]>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`)
      .pipe(
        switchMap((response) => {
          const families = response.data ?? [];
          if (families.length === 0) {
            return of([]);
          }

          // Bước 2: Tạo mảng các observable để gọi song song cho từng gia đình
          const detailsObservables = families.map((family) => {
            const members = family.members ?? [];
            const creator = members.find((m) => m.userId === family.createdByUserId);
            const creatorName = creator?.displayName ?? `#${family.createdByUserId}`;

            const budgetsUrl = `${API_CONFIG.GATEWAY_URL}/expense/budgets`;
            const summaryUrl = `${API_CONFIG.GATEWAY_URL}/expense/expenses/summary`;
            const expensesUrl = `${API_CONFIG.GATEWAY_URL}/expense/expenses`;

            const budgetParams = new HttpParams().set('familyId', String(family.id));
            const summaryParams = new HttpParams().set('familyId', String(family.id)).set('month', this.monthKey);
            const expenseParams = new HttpParams().set('familyId', String(family.id)).set('month', this.monthKey);

            // Gọi song song 3 API của mỗi gia đình và bóc tách envelope ApiEnvelope
            return forkJoin({
              budgetsRes: this.http.get<ApiEnvelope<ExpenseBudgetApi[]>>(budgetsUrl, { params: budgetParams }).pipe(
                catchError(() => of({ success: false, message: '', data: [] as ExpenseBudgetApi[] }))
              ),
              summaryRes: this.http.get<ApiEnvelope<ExpenseSummaryApi>>(summaryUrl, { params: summaryParams }).pipe(
                catchError(() => of({ success: false, message: '', data: { month: this.monthKey, totalAmount: 0, byCategories: [] } as ExpenseSummaryApi }))
              ),
              expensesRes: this.http.get<ApiEnvelope<ExpenseApi[]>>(expensesUrl, { params: expenseParams }).pipe(
                catchError(() => of({ success: false, message: '', data: [] as ExpenseApi[] }))
              )
            }).pipe(
              map(({ budgetsRes, summaryRes, expensesRes }) => {
                const budgets = budgetsRes.data ?? [];
                const summary = summaryRes.data ?? { month: this.monthKey, totalAmount: 0, byCategories: [] };
                const expenses = expensesRes.data ?? [];

                // Lấy ngân sách của tháng hiện tại
                const currentBudgetRecord = budgets.find((b) => b.month === this.monthKey);
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
                  creatorName,
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
          this.calculateSystemMetrics();
          this.applyFilters();
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

  onMonthChange(newMonth: string): void {
    if (newMonth && newMonth !== this.monthKey) {
      this.monthKey = newMonth;
      this.loadFinanceData();
    }
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.applyFilters();
  }

  applyFilters(): void {
    const keyword = this.searchText.trim().toLowerCase();
    if (!keyword) {
      this.filteredFamilies = [...this.familiesFinance];
      return;
    }

    this.filteredFamilies = this.familiesFinance.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.creatorName.toLowerCase().includes(keyword) ||
        item.id.toString().includes(keyword)
    );
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
  }

  closeDrawer(): void {
    this.isDrawerVisible = false;
    this.selectedFamily = null;
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
