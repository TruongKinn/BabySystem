import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { API_CONFIG } from '../../shared/constants/api.constant';
import {
  DashboardSnapshot,
  FamilyMember,
  MealPlanItem,
  ShoppingItem,
  TaskItem
} from '../models/super-app.model';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CategorySummaryApi {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
}

interface ExpenseSummaryApi {
  month: string;
  totalAmount: number;
  byCategories: CategorySummaryApi[];
}

interface ExpenseDailySummaryApi {
  date: string;
  totalAmount: number;
  byCategories: CategorySummaryApi[];
}

interface BudgetApi {
  id: number;
  familyId: number;
  month: string;
  limitAmount: number;
}

interface InsightDashboardApi {
  familyId: number;
  date: string;
  expenseToday: number;
  pendingTasks: number;
  mealsPlannedToday: number;
  babySleepHours: number;
  babyFeedings: number;
  diaperChanges: number;
  moodScore: number;
}

interface MealPlanApi {
  id: number;
  familyId: number;
  mealId: number;
  mealName: string;
  planDate: string;
  notes: string | null;
}

interface WeeklyMealPlanApi {
  weekStart: string;
  weekEnd: string;
  plans: MealPlanApi[];
}

interface MealApi {
  id: number;
  familyId: number;
  name: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  description: string | null;
}

interface TaskApi {
  id: number;
  familyId: number;
  title: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  assigneeUserId: number | null;
  dueAt: string | null;
  completedAt: string | null;
}

interface TaskPendingCountApi {
  familyId: number;
  pendingCount: number;
}

interface ShoppingItemApi {
  id: number;
  listId: number;
  listName: string;
  familyId: number;
  itemName: string;
  quantity: string | null;
  note: string | null;
  checked: boolean;
}

interface ShoppingPendingCountApi {
  familyId: number;
  pendingCount: number;
}

interface FamilyMemberApi {
  userId: number;
  displayName: string;
  role: 'MOM' | 'DAD' | 'GRANDMA' | 'CAREGIVER' | 'ADMIN';
}

interface FamilyApi {
  id: number;
  name: string;
  createdByUserId: number;
  members: FamilyMemberApi[];
}

interface BabyApi {
  id: number;
  familyId: number;
  name: string;
  birthDate: string;
  gender: string;
  notes: string | null;
}

interface BabySummaryApi {
  babyId: number;
  date: string;
  sleepHours: number;
  feedings: number;
  diaperChanges: number;
  latestWeightKg: number | null;
  nextVaccination: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MockSuperAppService {
  private readonly apiBase = API_CONFIG.GATEWAY_URL;

  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<DashboardSnapshot> {
    const familyId = this.getFamilyId();
    const month = this.currentMonth();

    return this.requestOrDefault(this.getBabies(familyId), []).pipe(
      switchMap((babies) => {
        const primaryBaby = babies[0] ?? null;
        const babySummary$ = primaryBaby
          ? this.requestOrDefault(this.getBabySummary(primaryBaby.id), this.emptyBabySummary(primaryBaby.id))
          : of(this.emptyBabySummary(API_CONFIG.DEFAULT_BABY_ID));

        return forkJoin({
          family: this.requestOrDefault(this.getFamily(familyId), this.emptyFamily(familyId)),
          insight: this.requestOrDefault(this.getInsightDashboard(familyId), this.emptyInsightDashboard(familyId)),
          dailyExpense: this.requestOrDefault(this.getExpenseDailySummary(familyId), this.emptyDailyExpenseSummary()),
          monthlyExpense: this.requestOrDefault(
            this.getExpenseMonthlySummary(familyId, month),
            this.emptyMonthlyExpenseSummary(month)
          ),
          budgets: this.requestOrDefault(this.getBudgets(familyId), []),
          todayMeals: this.requestOrDefault(this.getTodayMealPlans(familyId), []),
          pendingTasks: this.requestOrDefault(this.getTaskPendingCount(familyId), { familyId, pendingCount: 0 }),
          pendingShopping: this.requestOrDefault(this.getShoppingPendingCount(familyId), { familyId, pendingCount: 0 }),
          babySummary: babySummary$,
          primaryBaby: of(primaryBaby)
        });
      }),
      map(({ family, insight, dailyExpense, monthlyExpense, budgets, todayMeals, pendingTasks, pendingShopping, babySummary, primaryBaby }) => {
        const monthlyBudget = this.resolveMonthlyBudget(budgets, month);
        const monthlySpent = this.asNumber(monthlyExpense.totalAmount);
        const spentToday = this.asNumber(dailyExpense.totalAmount);
        const topCategory = this.resolveTopCategory(monthlyExpense.byCategories);
        const meals = todayMeals.map((item) => item.mealName).filter((name) => !!name?.trim());

        return {
          familyName: family.name ?? '',
          expense: {
            spentToday,
            monthlyBudget,
            monthlySpent,
            topCategory
          },
          baby: {
            babyName: primaryBaby?.name ?? '',
            sleepHours: this.asNumber(babySummary.sleepHours),
            feedings: Math.max(0, Math.trunc(this.asNumber(babySummary.feedings))),
            diaperChanges: Math.max(0, Math.trunc(this.asNumber(babySummary.diaperChanges))),
            nextVaccination: babySummary.nextVaccination ?? ''
          },
          todayMeals: meals,
          pendingTasks: Math.max(0, Math.trunc(this.asNumber(pendingTasks.pendingCount))),
          shoppingReminders: Math.max(0, Math.trunc(this.asNumber(pendingShopping.pendingCount))),
          moodScore: Math.max(0, Math.min(100, Math.trunc(this.asNumber(insight.moodScore))))
        };
      })
    );
  }

  getWeekMeals(): Observable<MealPlanItem[]> {
    const familyId = this.getFamilyId();

    return forkJoin({
      weeklyPlans: this.requestOrDefault(this.getWeeklyMealPlans(familyId), this.emptyWeeklyMealPlan()),
      meals: this.requestOrDefault(this.getMeals(familyId), [])
    }).pipe(map(({ weeklyPlans, meals }) => this.mapWeeklyMeals(weeklyPlans, meals)));
  }

  getTasks(): Observable<TaskItem[]> {
    const familyId = this.getFamilyId();
    const params = new HttpParams().set('familyId', String(familyId));

    return this.get<TaskApi[]>('/task/tasks', params).pipe(
      map((tasks) =>
        tasks.map((task) => ({
          id: String(task.id),
          title: task.title,
          assignee: task.assigneeUserId ? `#${task.assigneeUserId}` : '',
          dueAt: task.dueAt ? this.formatDateTime(task.dueAt) : '',
          done: task.status === 'DONE'
        }))
      ),
      catchError(() => of([]))
    );
  }

  getShoppingItems(): Observable<ShoppingItem[]> {
    const familyId = this.getFamilyId();
    const params = new HttpParams().set('familyId', String(familyId));

    return this.get<ShoppingItemApi[]>('/shopping/shopping-items', params).pipe(
      map((items) =>
        items.map((item) => ({
          id: String(item.id),
          name: item.itemName,
          quantity: item.quantity?.trim() || '-',
          checked: item.checked
        }))
      ),
      catchError(() => of([]))
    );
  }

  getFamilyMembers(): Observable<FamilyMember[]> {
    const familyId = this.getFamilyId();

    return this.getFamily(familyId).pipe(
      map((family) =>
        family.members.map((member) => ({
          id: String(member.userId),
          name: member.displayName,
          role: this.normalizeRole(member.role),
          avatarColor: this.colorByUserId(member.userId)
        }))
      ),
      catchError(() => of([]))
    );
  }

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(`${this.apiBase}${path}`, { params })
      .pipe(map((response) => response.data));
  }

  private getFamily(familyId: number): Observable<FamilyApi> {
    return this.get<FamilyApi>(`/account/families/${familyId}`);
  }

  private getInsightDashboard(familyId: number): Observable<InsightDashboardApi> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<InsightDashboardApi>('/insight/insights/dashboard', params);
  }

  private getExpenseDailySummary(familyId: number): Observable<ExpenseDailySummaryApi> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<ExpenseDailySummaryApi>('/expense/expenses/summary/daily', params);
  }

  private getExpenseMonthlySummary(familyId: number, month: string): Observable<ExpenseSummaryApi> {
    const params = new HttpParams().set('familyId', String(familyId)).set('month', month);
    return this.get<ExpenseSummaryApi>('/expense/expenses/summary', params);
  }

  private getBudgets(familyId: number): Observable<BudgetApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<BudgetApi[]>('/expense/budgets', params);
  }

  private getTodayMealPlans(familyId: number): Observable<MealPlanApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<MealPlanApi[]>('/meal/meal-plans/today', params);
  }

  private getWeeklyMealPlans(familyId: number): Observable<WeeklyMealPlanApi> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<WeeklyMealPlanApi>('/meal/meal-plans/weekly', params);
  }

  private getMeals(familyId: number): Observable<MealApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<MealApi[]>('/meal/meals', params);
  }

  private getTaskPendingCount(familyId: number): Observable<TaskPendingCountApi> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<TaskPendingCountApi>('/task/tasks/pending/count', params);
  }

  private getShoppingPendingCount(familyId: number): Observable<ShoppingPendingCountApi> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<ShoppingPendingCountApi>('/shopping/shopping-items/pending/count', params);
  }

  private getBabies(familyId: number): Observable<BabyApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<BabyApi[]>('/baby/babies', params);
  }

  private getBabySummary(babyId: number): Observable<BabySummaryApi> {
    return this.get<BabySummaryApi>(`/baby/babies/${babyId}/summary`);
  }

  private resolveMonthlyBudget(budgets: BudgetApi[], currentMonth: string): number {
    if (budgets.length === 0) {
      return 0;
    }

    const exact = budgets.find((budget) => budget.month === currentMonth);
    if (exact) {
      return this.asNumber(exact.limitAmount);
    }

    return this.asNumber(budgets[0].limitAmount);
  }

  private resolveTopCategory(categories: CategorySummaryApi[]): string {
    if (categories.length === 0) {
      return '';
    }

    const sorted = [...categories].sort((left, right) => this.asNumber(right.totalAmount) - this.asNumber(left.totalAmount));
    return sorted[0]?.categoryName ?? '';
  }

  private mapWeeklyMeals(weekly: WeeklyMealPlanApi, meals: MealApi[]): MealPlanItem[] {
    const mealTypeById = new Map<number, MealApi['mealType']>(meals.map((meal) => [meal.id, meal.mealType]));
    const byDate = new Map<string, MealPlanItem>();

    const plannedDates = this.collectWeekDates(weekly.weekStart, weekly.weekEnd);
    plannedDates.forEach((date) => {
      byDate.set(date, {
        day: this.formatWeekday(date),
        breakfast: '-',
        lunch: '-',
        dinner: '-'
      });
    });

    weekly.plans.forEach((plan) => {
      const dateKey = plan.planDate;
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          day: this.formatWeekday(dateKey),
          breakfast: '-',
          lunch: '-',
          dinner: '-'
        });
      }

      const entry = byDate.get(dateKey);
      if (!entry) {
        return;
      }

      const mealType = mealTypeById.get(plan.mealId) ?? 'DINNER';
      if (mealType === 'BREAKFAST') {
        entry.breakfast = plan.mealName;
      } else if (mealType === 'LUNCH') {
        entry.lunch = plan.mealName;
      } else if (mealType === 'DINNER') {
        entry.dinner = plan.mealName;
      }
    });

    return Array.from(byDate.entries())
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([, item]) => item);
  }

  private collectWeekDates(weekStart: string, weekEnd: string): string[] {
    if (!weekStart || !weekEnd) {
      return [];
    }

    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(`${weekEnd}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [];
    }

    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  private formatWeekday(dateText: string): string {
    const date = new Date(`${dateText}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateText;
    }
    const locale = this.getLocale();
    const weekday = date.toLocaleDateString(locale, { weekday: 'short' });
    const monthDay = date.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' });
    return `${weekday} (${monthDay})`;
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(this.getLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private requestOrDefault<T>(request: Observable<T>, fallback: T): Observable<T> {
    return request.pipe(catchError(() => of(fallback)));
  }

  private currentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getFamilyId(): number {
    if (typeof window === 'undefined') {
      return API_CONFIG.DEFAULT_FAMILY_ID;
    }

    const raw = window.localStorage.getItem('mom_family_id') ?? window.localStorage.getItem('atg_family_id');
    if (!raw) {
      return API_CONFIG.DEFAULT_FAMILY_ID;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : API_CONFIG.DEFAULT_FAMILY_ID;
  }

  private getLocale(): string {
    if (typeof window === 'undefined') {
      return 'en-US';
    }

    const selected = window.localStorage.getItem('atg_lang');
    if (selected === 'vi') {
      return 'vi-VN';
    }
    if (selected === 'en') {
      return 'en-US';
    }

    return window.navigator.language || 'en-US';
  }

  private asNumber(value: unknown): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private normalizeRole(role: FamilyMemberApi['role']): FamilyMember['role'] {
    if (role === 'MOM' || role === 'DAD' || role === 'GRANDMA' || role === 'CAREGIVER') {
      return role;
    }
    return 'CAREGIVER';
  }

  private colorByUserId(userId: number): string {
    const palette = ['#f59e0b', '#0ea5e9', '#22c55e', '#ec4899', '#a855f7', '#14b8a6'];
    const index = Math.abs(userId) % palette.length;
    return palette[index] ?? '#0ea5e9';
  }

  private emptyFamily(familyId: number): FamilyApi {
    return {
      id: familyId,
      name: '',
      createdByUserId: 0,
      members: []
    };
  }

  private emptyInsightDashboard(familyId: number): InsightDashboardApi {
    return {
      familyId,
      date: new Date().toISOString().slice(0, 10),
      expenseToday: 0,
      pendingTasks: 0,
      mealsPlannedToday: 0,
      babySleepHours: 0,
      babyFeedings: 0,
      diaperChanges: 0,
      moodScore: 70
    };
  }

  private emptyDailyExpenseSummary(): ExpenseDailySummaryApi {
    return {
      date: new Date().toISOString().slice(0, 10),
      totalAmount: 0,
      byCategories: []
    };
  }

  private emptyMonthlyExpenseSummary(month: string): ExpenseSummaryApi {
    return {
      month,
      totalAmount: 0,
      byCategories: []
    };
  }

  private emptyBabySummary(babyId: number): BabySummaryApi {
    return {
      babyId,
      date: new Date().toISOString().slice(0, 10),
      sleepHours: 0,
      feedings: 0,
      diaperChanges: 0,
      latestWeightKg: null,
      nextVaccination: null
    };
  }

  private emptyWeeklyMealPlan(): WeeklyMealPlanApi {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      plans: []
    };
  }
}
