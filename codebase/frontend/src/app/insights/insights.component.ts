import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import { DashboardSnapshot } from '../core/models/super-app.model';
import {
  InsightDailyBreakdownItem,
  InsightMonthlyReport,
  MockSuperAppService
} from '../core/services/mock-super-app.service';
import { ResolvedPremiumFeature, SuperAppCommandService } from '../core/services/super-app-command.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { I18nService } from '../i18n/i18n.service';

type InsightRiskLevel = 'GOOD' | 'WARNING' | 'CRITICAL';

interface DailyReportRow extends InsightDailyBreakdownItem {
  riskLevel: InsightRiskLevel;
}

interface InsightRecommendation {
  tone: 'good' | 'warning' | 'critical';
  title: string;
  detail: string;
}

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule
  ],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.css'
})
export class InsightsComponent implements OnInit {
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly i18n = inject(I18nService);
  private readonly userPreferences = inject(UserPreferencesService);
  private readonly fb = inject(FormBuilder);
  private readonly notification = inject(NzNotificationService);
  private readonly premiumReportsFeatureKey = PREMIUM_FEATURE_KEYS.premiumReports;
  private readonly aiCareAssistantFeatureKey = PREMIUM_FEATURE_KEYS.aiCareAssistant;
  private readonly passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  };

  loading = false;
  exporting = false;
  monthKey = this.currentMonthKey();
  premiumReportsLocked = false;
  aiCareAssistantLocked = false;
  isExportPasswordModalVisible = false;
  exportErrorMessage = '';

  userCurrency = this.userPreferences.getCurrency();
  exportPasswordForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.passwordMatchValidator }
  );

  familyName = '';
  moodScore = 0;

  sleepScore = 0;
  budgetScore = 0;
  workloadScore = 0;
  taskCompletionRate = 0;
  budgetPercent = 0;

  monthlyExpenseTotal = 0;
  monthlyExpenseCount = 0;
  monthlyMealsPlanned = 0;
  monthlySleepHours = 0;
  monthlyFeedings = 0;
  monthlyDiaperChanges = 0;
  pendingTaskGap = 0;

  dailyRows: DailyReportRow[] = [];
  recommendations: InsightRecommendation[] = [];

  ngOnInit(): void {
    this.userPreferences.currency$.subscribe((currency) => {
      this.userCurrency = currency;
    });
    this.loadPremiumFeatures();
  }

  onMonthChange(rawMonth: string): void {
    const nextMonth = this.normalizeMonthKey(rawMonth);
    if (nextMonth === this.monthKey) {
      return;
    }
    this.monthKey = nextMonth;
    this.loadInsights();
  }

  loadInsights(): void {
    if (this.premiumReportsLocked) {
      this.loading = false;
      this.dailyRows = [];
      this.recommendations = [];
      return;
    }

    const month = this.normalizeMonthKey(this.monthKey);
    this.monthKey = month;
    this.loading = true;

    forkJoin({
      snapshot: this.data.getDashboard(),
      monthly: this.data.getInsightMonthlyReport(month)
    })
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: ({ snapshot, monthly }) => {
          this.applyInsightData(snapshot, monthly);
        },
        error: (err) => {
          if (this.isPremiumRequired(err, this.premiumReportsFeatureKey)) {
            this.premiumReportsLocked = true;
            this.dailyRows = [];
            this.recommendations = [];
          }
        }
      });
  }

  openExportPasswordDialog(): void {
    if (this.dailyRows.length === 0 || this.premiumReportsLocked) {
      return;
    }

    this.exportErrorMessage = '';
    this.exportPasswordForm.reset();
    this.isExportPasswordModalVisible = true;
  }

  closeExportPasswordDialog(): void {
    if (this.exporting) {
      return;
    }
    this.isExportPasswordModalVisible = false;
    this.exportErrorMessage = '';
  }

  submitXlsxExport(): void {
    if (this.exportPasswordForm.invalid) {
      this.exportPasswordForm.markAllAsTouched();
      return;
    }

    this.exporting = true;
    this.exportErrorMessage = '';
    this.data.exportInsightMonthlyReportXlsx({
      month: this.monthKey,
      password: this.exportPasswordForm.controls.password.value,
      currency: this.userCurrency,
      locale: this.i18n.getCurrentLanguage(),
      familyName: this.familyName
    })
      .pipe(finalize(() => {
        this.exporting = false;
      }))
      .subscribe({
        next: (response) => this.handleExportResponse(response),
        error: (err) => {
          const fallback = this.t('momApp.insights.export.failed', 'Unable to export protected XLSX report.');
          this.exportErrorMessage = err?.error?.message || fallback;
          this.notification.error(this.t('common.errorTitle', 'Error'), this.exportErrorMessage);
        }
      });
  }

  formatReportDate(dateText: string): string {
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateText;
    }

    return date.toLocaleDateString(this.currentLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  riskLabel(level: InsightRiskLevel): string {
    if (level === 'CRITICAL') {
      return this.t('momApp.insights.risk.critical', 'Critical');
    }
    if (level === 'WARNING') {
      return this.t('momApp.insights.risk.warning', 'Warning');
    }
    return this.t('momApp.insights.risk.good', 'Good');
  }

  showPasswordError(controlName: 'password' | 'confirmPassword'): boolean {
    const control = this.exportPasswordForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  passwordsDoNotMatch(): boolean {
    return !!this.exportPasswordForm.errors?.['passwordMismatch'] &&
      (this.exportPasswordForm.controls.confirmPassword.dirty || this.exportPasswordForm.controls.confirmPassword.touched);
  }

  trackByReportDate(_: number, item: DailyReportRow): string {
    return item.date;
  }

  private handleExportResponse(response: HttpResponse<Blob>): void {
    const file = response.body;
    if (!file) {
      this.exportErrorMessage = this.t('momApp.insights.export.noFile', 'The export file is empty.');
      return;
    }

    this.downloadBlob(file, this.resolveXlsxFileName(response));
    this.isExportPasswordModalVisible = false;
    this.exportPasswordForm.reset();
    this.notification.success(
      this.t('momApp.common.success', 'Success'),
      this.t('momApp.insights.export.success', 'Protected XLSX report downloaded.')
    );
  }

  private applyInsightData(snapshot: DashboardSnapshot, monthly: InsightMonthlyReport): void {
    const budgetPercent =
      snapshot.expense.monthlyBudget > 0
        ? Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)
        : 0;

    this.familyName = snapshot.familyName;
    this.moodScore = this.clamp(Math.trunc(snapshot.moodScore), 0, 100);

    this.sleepScore = this.clamp(Math.round((snapshot.baby.sleepHours / 12) * 100), 0, 100);
    this.budgetScore = this.clamp(100 - budgetPercent, 0, 100);
    this.workloadScore = this.clamp(100 - snapshot.pendingTasks * 8, 0, 100);
    this.budgetPercent = this.clamp(budgetPercent, 0, 999);

    this.taskCompletionRate =
      monthly.tasksCreated > 0
        ? this.clamp(Math.round((monthly.tasksCompleted / monthly.tasksCreated) * 100), 0, 100)
        : 100;

    this.monthlyExpenseTotal = monthly.expenseTotal;
    this.monthlyExpenseCount = monthly.expenseCount;
    this.monthlyMealsPlanned = monthly.mealsPlanned;
    this.monthlySleepHours = monthly.babySleepHours;
    this.monthlyFeedings = monthly.babyFeedings;
    this.monthlyDiaperChanges = monthly.diaperChanges;
    this.pendingTaskGap = Math.max(0, monthly.tasksCreated - monthly.tasksCompleted);

    const baseRows = monthly.dailyBreakdown.length > 0
      ? monthly.dailyBreakdown
      : [this.buildFallbackDailyRow(snapshot)];

    const averageExpense = baseRows.length > 0
      ? baseRows.reduce((sum, row) => sum + row.expenseTotal, 0) / baseRows.length
      : 0;

    this.dailyRows = baseRows.map((item) => ({
      ...item,
      riskLevel: this.resolveRiskLevel(item, averageExpense)
    }));

    this.recommendations = this.aiCareAssistantLocked ? [] : this.buildRecommendations(snapshot.baby.sleepHours);
  }

  private buildRecommendations(todaySleepHours: number): InsightRecommendation[] {
    const items: InsightRecommendation[] = [];

    if (this.sleepScore < 65) {
      items.push({
        tone: 'critical',
        title: 'Stabilize baby sleep routine',
        detail: `Today sleep is ${Number(todaySleepHours.toFixed(1))}h. Keep fixed bedtime and reduce evening stimulation.`
      });
    }

    if (this.budgetPercent > 90) {
      items.push({
        tone: this.budgetPercent > 110 ? 'critical' : 'warning',
        title: 'Control budget overspending risk',
        detail: `Budget usage is ${this.budgetPercent}%. Review high-cost categories and postpone non-urgent expenses.`
      });
    }

    if (this.pendingTaskGap > 3 || this.taskCompletionRate < 65) {
      items.push({
        tone: 'warning',
        title: 'Rebalance family workload',
        detail: `Pending task gap is ${this.pendingTaskGap}. Re-assign owners and close overdue tasks first.`
      });
    }

    if (items.length === 0) {
      items.push({
        tone: 'good',
        title: 'Current operations are stable',
        detail: 'Keep current routine and continue weekly review to maintain performance.'
      });
    }

    return items;
  }

  private resolveRiskLevel(item: InsightDailyBreakdownItem, averageExpense: number): InsightRiskLevel {
    const highExpenseThreshold = averageExpense > 0 ? averageExpense * 1.6 : 0;
    const warningExpenseThreshold = averageExpense > 0 ? averageExpense * 1.15 : 0;

    if (
      item.pendingTasks >= 5 ||
      item.babySleepHours < 6 ||
      (highExpenseThreshold > 0 && item.expenseTotal >= highExpenseThreshold)
    ) {
      return 'CRITICAL';
    }

    if (
      item.pendingTasks >= 3 ||
      item.babySleepHours < 8 ||
      (warningExpenseThreshold > 0 && item.expenseTotal >= warningExpenseThreshold)
    ) {
      return 'WARNING';
    }

    return 'GOOD';
  }

  private buildFallbackDailyRow(snapshot: DashboardSnapshot): InsightDailyBreakdownItem {
    return {
      date: new Date().toISOString().slice(0, 10),
      expenseTotal: snapshot.expense.spentToday,
      pendingTasks: snapshot.pendingTasks,
      babySleepHours: snapshot.baby.sleepHours
    };
  }

  private normalizeMonthKey(rawMonth: string): string {
    const value = rawMonth?.trim();
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      return value;
    }
    return this.currentMonthKey();
  }

  private currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private currentLocale(): string {
    return this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
  }

  private resolveXlsxFileName(response: HttpResponse<Blob>): string {
    const explicitName = response.headers.get('X-Export-File-Name');
    if (explicitName) {
      return explicitName;
    }

    const disposition = response.headers.get('Content-Disposition') ?? response.headers.get('content-disposition');
    const encodedMatch = disposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1].replace(/"/g, ''));
    }

    const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);
    if (filenameMatch?.[1]) {
      return filenameMatch[1];
    }

    return `MOM_INSIGHTS_${this.monthKey.replace('-', '')}.xlsx`;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  private t(key: string, fallback: string, params?: Record<string, unknown>): string {
    const translated = this.i18n.translate(key, params);
    return translated && translated !== key ? translated : fallback;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private loadPremiumFeatures(): void {
    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      this.premiumReportsLocked = !this.hasFeatureEnabled(features, this.premiumReportsFeatureKey);
      this.aiCareAssistantLocked = !this.hasFeatureEnabled(features, this.aiCareAssistantFeatureKey);
      this.loadInsights();
    });
  }

  private hasFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string): boolean {
    const matched = features.find((item) => item.featureKey === featureKey);
    return matched ? matched.enabled : true;
  }

  private isPremiumRequired(err: any, featureKey: string): boolean {
    const message = String(err?.message ?? '');
    return message.includes(`PREMIUM_REQUIRED:${featureKey}`);
  }
}
