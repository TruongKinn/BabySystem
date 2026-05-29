import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ExpenseCategoryApi {
  id: number;
  familyId: number;
  name: string;
  colorCode: string;
  defaultCategory: boolean;
}

interface ShoppingListApi {
  id: number;
  familyId: number;
  name: string;
  active: boolean;
}

interface MealApi {
  id: number;
  familyId: number;
  name: string;
  mealType: MealType;
  description: string | null;
}

export interface BabyProfile {
  id: number;
  familyId: number;
  name: string;
  birthDate: string;
  gender: BabyGender;
  notes: string | null;
}

export interface BabyLogEntry {
  id: number;
  babyId: number;
  logType: BabyLogType;
  value: number | null;
  note: string | null;
  loggedAt: string;
}

export interface BabyDailySummary {
  babyId: number;
  date: string;
  sleepHours: number;
  feedings: number;
  diaperChanges: number;
  latestWeightKg: number | null;
  nextVaccination: string | null;
  careStreakDays: number;
  lastUpdatedAt: string | null;
}

export interface BabyCareTrendPoint {
  date: string;
  sleepHours: number;
  feedings: number;
  diaperChanges: number;
  totalLogs: number;
}

export interface BabyLogComment {
  id: number;
  babyLogId: number;
  userId: number;
  content: string;
  createdAt: string;
  parentId: number | null;
  replies?: BabyLogComment[];
  reactionCounts?: Record<string, number>;
  myReaction?: string | null;
}

export interface BabyGrowthRecord {
  id: number;
  babyId: number;
  measuredAt: string;
  weightKg: number | null;
  heightCm: number | null;
  headCircumferenceCm: number | null;
  notes: string | null;
}

export interface BabyVaccination {
  id: number;
  babyId: number;
  vaccineName: string;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
}

export interface BabyGrowthInsight {
  latest: BabyGrowthRecord | null;
  previous: BabyGrowthRecord | null;
  weightDeltaKg: number | null;
  heightDeltaCm: number | null;
  headCircumferenceDeltaCm: number | null;
}

export interface BabyVaccinationInsight {
  nextDueDate: string | null;
  upcomingCount: number;
  overdueCount: number;
  upcomingVaccinations: BabyVaccination[];
}

export interface BabyDashboard {
  baby: BabyProfile;
  dailySummary: BabyDailySummary;
  dailyTrend: BabyCareTrendPoint[];
  recentLogs: BabyLogEntry[];
  growthInsight: BabyGrowthInsight;
  vaccinationInsight: BabyVaccinationInsight;
}

export interface ResolvedPremiumFeature {
  featureKey: string;
  enabled: boolean;
  sourceStatus: string;
  expiresAt: string | null;
}

export interface FamilyQuestState {
  familyId: number;
  lastClaimDate: string | null;
  streakDays: number;
  totalPoints: number;
  claimedToday: boolean;
}

export interface FamilyQuestRewardCatalogItem {
  rewardKey: string;
  name: string;
  description: string;
  costPoints: number;
}

export interface FamilyQuestRewardRedemption {
  id: number;
  rewardKey: string;
  rewardName: string;
  costPoints: number;
  redeemedByUserId: number | null;
  redeemedAt: string;
}

export interface FamilyQuestRedeemResponse {
  questState: FamilyQuestState;
  redemption: FamilyQuestRewardRedemption;
}

interface UserApi {
  id: number;
  username: string;
  email: string;
  displayName: string;
  dateOfBirth?: string | null;
}

interface FamilyMemberApi {
  userId: number;
  displayName: string;
  role: FamilyRole;
  relation: FamilyRelation;
  parentUserId: number | null;
  dateOfBirth?: string | null;
}

interface FamilyApi {
  id: number;
  name: string;
  createdByUserId: number;
  members: FamilyMemberApi[];
}

export interface ExpenseApi {
  id: number;
  familyId: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  currency: string;
  note: string | null;
  spentAt: string;
}

export interface ExpenseSummaryCategoryApi {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
}

export interface ExpenseSummaryApi {
  month: string;
  totalAmount: number;
  byCategories: ExpenseSummaryCategoryApi[];
}

export interface ExpenseDailySummaryApi {
  date: string;
  totalAmount: number;
  byCategories: ExpenseSummaryCategoryApi[];
}

export interface ExpenseCategoryReportItemApi {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

export interface ExpenseCategoryReportApi {
  month: string;
  totalAmount: number;
  categories: ExpenseCategoryReportItemApi[];
}

export interface ExpenseBudgetApi {
  id: number;
  familyId: number;
  month: string;
  limitAmount: number;
}

export interface ExpenseProposalApi {
  id: number;
  familyId: number;
  title: string;
  amount: number;
  categoryName: string;
  proposedBy: string;
  approver: string;
  status: string;
  rejectReason: string | null;
  currentStep: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface ExchangeRateApi {
  currency: string;
  buyRate: number | null;
  sellRate: number | null;
  updatedAt: string;
}

export interface ConvertCurrencyResponseApi {
  fromCurrency: string;
  originalAmount: number;
  amountVnd: number;
  sellRate: number;
  rateUpdatedAt: string;
}

interface NotificationSettings {
  notificationEnabled: boolean;
  reminderHour: string;
}

export interface FileMetadata {
  id: number;
  familyId: number;
  userId: number | null;
  bucketName: string;
  objectKey: string;
  originalFileName: string;
  contentType: string | null;
  sizeBytes: number;
  fileTag: string | null;
  createdAt: string;
}

export interface ProfileInfo {
  userId: number | null;
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

export interface FamilyMemberProfile {
  userId: number;
  displayName: string;
  username: string;
  email: string;
  role: FamilyRole;
  relation: FamilyRelation;
  parentUserId: number | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
}

export interface UpcomingBirthdayNotification {
  userId: number;
  displayName: string;
  role: FamilyRole;
  relation: FamilyRelation;
  dateOfBirth: string;
  nextBirthday: string;
  daysUntilBirthday: number;
  turningAge: number;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type BabyGender = 'MALE' | 'FEMALE' | 'OTHER';
export type BabyLogType = 'SLEEP' | 'FEEDING' | 'DIAPER';
export type FamilyRole = 'MOM' | 'DAD' | 'GRANDMA' | 'CAREGIVER' | 'ADMIN';
export type FamilyRelation =
  | 'ONG_NOI'
  | 'BA_NOI'
  | 'ONG_NGOAI'
  | 'BA_NGOAI'
  | 'BO'
  | 'ME'
  | 'ANH_TRAI'
  | 'CHI_GAI'
  | 'EM_TRAI'
  | 'EM_GAI'
  | 'CON_TRAI'
  | 'CON_GAI'
  | 'CHU'
  | 'BAC'
  | 'CO'
  | 'DI'
  | 'CAU'
  | 'MO'
  | 'THIM'
  | 'BAO_MAU'
  | 'THANH_VIEN_KHAC';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface ExcelParseRow {
  rowNumber: number;
  data: Record<string, any>;
}

export interface ExcelParseResponse {
  headers: string[];
  rows: ExcelParseRow[];
  totalRows: number;
}

export interface DocumentParseResponse {
  filename: string;
  pageCount: number;
  sizeKb: number;
  textPreview: string;
  author: string;
}

export interface BatchImportResponse {
  successCount: number;
  failedCount: number;
  errors: { index: number; reason: string }[];
}

export interface JourneyEventApi {
  id: string;
  babyId: number;
  title: string;
  story: string | null;
  happenedAt: string;
  type: 'CARE' | 'GROWTH' | 'HEALTH' | 'FAMILY' | 'MEMORY' | 'CAPSULE';
  privacy: 'FAMILY' | 'PARENTS' | 'PRIVATE';
  source: 'SYSTEM' | 'MANUAL' | 'AI' | 'CAPSULE';
  sourceRef: string | null;
  capsuleOpenAt: string | null;
  recipient: string | null;
  createdAt: string;
  createdBy: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SuperAppCommandService {
  private readonly apiBase = API_CONFIG.GATEWAY_URL;
  private readonly settingsStorageKey = 'mom_settings';

  constructor(private readonly http: HttpClient) {}

  getFamilyId(): number {
    return this.getStoredFamilyId() ?? API_CONFIG.DEFAULT_FAMILY_ID;
  }

  getUserId(): number | null {
    const raw = this.getStored('atg_user_id');
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  getProfile(): Observable<ProfileInfo> {
    const fallbackName = this.getStored('atg_username') ?? 'Family User';
    const fallbackAvatar = this.resolveAvatarUrl(this.getStored('atg_avatar_url'));
    const fallbackUserId = this.getUserId();

    return this.resolveCurrentAccountUser().pipe(
      map((user) => {
        if (!user) {
          return this.buildProfileFallback(fallbackUserId, fallbackName, fallbackAvatar);
        }

        return {
          userId: user.id,
          displayName: user.displayName,
          username: user.username,
          email: user.email,
          avatarUrl: fallbackAvatar ?? this.buildAvatarUrl(user.id)
        };
      }),
      catchError(() => of(this.buildProfileFallback(fallbackUserId, fallbackName, fallbackAvatar)))
    );
  }

  getFamilyMembersDetailed(): Observable<FamilyMemberProfile[]> {
    return this.resolveCurrentAccountUser().pipe(
      switchMap((user) => {
        if (!user) {
          return of([]);
        }

        return this.resolveFamilyIdForUser(user.id).pipe(
          switchMap((familyId) => this.get<FamilyApi>(`/account/families/${familyId}`)),
          switchMap((family) => this.enrichFamilyMembers(family.members ?? []))
        );
      }),
      map((members) =>
        [...members].sort((left, right) => {
          const byRole = this.familyRoleOrder(left.role) - this.familyRoleOrder(right.role);
          if (byRole !== 0) {
            return byRole;
          }
          return left.displayName.localeCompare(right.displayName);
        })
      ),
      catchError(() => of([]))
    );
  }

  getUpcomingFamilyBirthdays(daysAhead = 14): Observable<UpcomingBirthdayNotification[]> {
    const familyId = this.getFamilyId();
    const safeDays = Number.isFinite(daysAhead) ? Math.max(0, Math.trunc(daysAhead)) : 14;
    const params = new HttpParams().set('days', String(safeDays));
    return this.get<UpcomingBirthdayNotification[]>(`/account/families/${familyId}/birthdays/upcoming`, params).pipe(
      map((items) =>
        [...(items ?? [])].sort((left, right) => {
          const byDay = left.daysUntilBirthday - right.daysUntilBirthday;
          if (byDay !== 0) {
            return byDay;
          }
          return left.displayName.localeCompare(right.displayName);
        })
      ),
      catchError(() => of([]))
    );
  }

  getResolvedFamilyFeatures(familyId?: number): Observable<ResolvedPremiumFeature[]> {
    const targetFamilyId = familyId ?? this.getFamilyId();
    return this.get<ResolvedPremiumFeature[]>(`/account/families/${targetFamilyId}/features/resolved`).pipe(
      map((items) => items ?? []),
      catchError(() => of([]))
    );
  }

  getFamilyQuestState(familyId?: number): Observable<FamilyQuestState> {
    const targetFamilyId = familyId ?? this.getFamilyId();
    return this.get<FamilyQuestState>(`/account/families/${targetFamilyId}/quest-state`).pipe(
      map((state) => ({
        familyId: targetFamilyId,
        lastClaimDate: state?.lastClaimDate ?? null,
        streakDays: Math.max(0, Math.trunc(Number(state?.streakDays ?? 0))),
        totalPoints: Math.max(0, Math.trunc(Number(state?.totalPoints ?? 0))),
        claimedToday: !!state?.claimedToday
      })),
      catchError(() =>
        of({
          familyId: targetFamilyId,
          lastClaimDate: null,
          streakDays: 0,
          totalPoints: 0,
          claimedToday: false
        })
      )
    );
  }

  claimFamilyQuestReward(rewardPoints: number, familyId?: number): Observable<FamilyQuestState> {
    const targetFamilyId = familyId ?? this.getFamilyId();
    const normalizedReward = Math.max(1, Math.min(500, Math.trunc(Number(rewardPoints) || 0)));
    return this.post<FamilyQuestState>(`/account/families/${targetFamilyId}/quest-state/claim`, {
      rewardPoints: normalizedReward
    }).pipe(
      map((state) => ({
        familyId: targetFamilyId,
        lastClaimDate: state?.lastClaimDate ?? null,
        streakDays: Math.max(0, Math.trunc(Number(state?.streakDays ?? 0))),
        totalPoints: Math.max(0, Math.trunc(Number(state?.totalPoints ?? 0))),
        claimedToday: !!state?.claimedToday
      }))
    );
  }

  getFamilyQuestRewardCatalog(familyId?: number): Observable<FamilyQuestRewardCatalogItem[]> {
    const targetFamilyId = familyId ?? this.getFamilyId();
    return this.get<FamilyQuestRewardCatalogItem[]>(`/account/families/${targetFamilyId}/quest-rewards/catalog`).pipe(
      map((items) =>
        (items ?? []).map((item) => ({
          rewardKey: (item.rewardKey ?? '').trim(),
          name: (item.name ?? '').trim(),
          description: (item.description ?? '').trim(),
          costPoints: Math.max(1, Math.trunc(Number(item.costPoints ?? 0)))
        }))
      ),
      catchError(() => of([]))
    );
  }

  getFamilyQuestRedemptions(familyId?: number): Observable<FamilyQuestRewardRedemption[]> {
    const targetFamilyId = familyId ?? this.getFamilyId();
    return this.get<FamilyQuestRewardRedemption[]>(`/account/families/${targetFamilyId}/quest-rewards/redemptions`).pipe(
      map((items) =>
        (items ?? []).map((item) => ({
          id: Math.max(0, Math.trunc(Number(item.id ?? 0))),
          rewardKey: (item.rewardKey ?? '').trim(),
          rewardName: (item.rewardName ?? '').trim(),
          costPoints: Math.max(0, Math.trunc(Number(item.costPoints ?? 0))),
          redeemedByUserId: Number.isFinite(Number(item.redeemedByUserId))
            ? Math.trunc(Number(item.redeemedByUserId))
            : null,
          redeemedAt: item.redeemedAt ?? ''
        }))
      ),
      catchError(() => of([]))
    );
  }

  redeemFamilyQuestReward(rewardKey: string, familyId?: number): Observable<FamilyQuestRedeemResponse> {
    const targetFamilyId = familyId ?? this.getFamilyId();
    return this.post<FamilyQuestRedeemResponse>(`/account/families/${targetFamilyId}/quest-rewards/redeem`, {
      rewardKey: (rewardKey ?? '').trim()
    }).pipe(
      map((response) => ({
        questState: {
          familyId: targetFamilyId,
          lastClaimDate: response?.questState?.lastClaimDate ?? null,
          streakDays: Math.max(0, Math.trunc(Number(response?.questState?.streakDays ?? 0))),
          totalPoints: Math.max(0, Math.trunc(Number(response?.questState?.totalPoints ?? 0))),
          claimedToday: !!response?.questState?.claimedToday
        },
        redemption: {
          id: Math.max(0, Math.trunc(Number(response?.redemption?.id ?? 0))),
          rewardKey: (response?.redemption?.rewardKey ?? '').trim(),
          rewardName: (response?.redemption?.rewardName ?? '').trim(),
          costPoints: Math.max(0, Math.trunc(Number(response?.redemption?.costPoints ?? 0))),
          redeemedByUserId: Number.isFinite(Number(response?.redemption?.redeemedByUserId))
            ? Math.trunc(Number(response?.redemption?.redeemedByUserId))
            : null,
          redeemedAt: response?.redemption?.redeemedAt ?? ''
        }
      }))
    );
  }

  uploadProfileAvatar(file: File): Observable<string> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post(`${this.apiBase}/auth/account/user/${userId}/avatar`, formData, { responseType: 'text' })
      .pipe(
        map((path) => {
          const resolvedUrl = this.resolveAvatarUrl(path);
          if (!resolvedUrl) {
            return '';
          }
          return `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
        })
      );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    const userId = this.getUserId();
    return this.http
      .patch<void>(`${this.apiBase}/auth/account/user/change-pwd`, {
        id: userId,
        oldPassword,
        newPassword
      });
  }

  get2faStatus(): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiBase}/auth/2fa/status`);
  }

  generate2faSecret(): Observable<{ secret: string; qrCodeUrl: string }> {
    return this.http.post<{ secret: string; qrCodeUrl: string }>(`${this.apiBase}/auth/2fa/generate`, {});
  }

  verifyAndEnable2fa(otp: string): Observable<string> {
    return this.http.post(`${this.apiBase}/auth/2fa/verify`, { otp }, { responseType: 'text' });
  }

  disable2fa(): Observable<string> {
    return this.http.post(`${this.apiBase}/auth/2fa/disable`, {}, { responseType: 'text' });
  }

  uploadUserAvatar(userId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post(`${this.apiBase}/auth/account/user/${userId}/avatar`, formData, { responseType: 'text' })
      .pipe(
        map((path) => {
          const resolvedUrl = this.resolveAvatarUrl(path);
          if (!resolvedUrl) {
            return '';
          }
          return `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
        })
      );
  }


  createExpense(input: { amount: number; note: string; categoryName: string; currency?: string }): Observable<void> {
    const familyId = this.getFamilyId();

    return this.ensureExpenseCategory(familyId, input.categoryName).pipe(
      switchMap((category) =>
        this.post('/expense/expenses', {
          familyId,
          categoryId: category.id,
          amount: input.amount,
          currency: (input.currency ?? 'VND').toUpperCase(),
          note: input.note,
          spentAt: new Date().toISOString()
        })
      ),
      map(() => undefined)
    );
  }

  getExpenses(month?: string, categoryId?: number | null): Observable<ExpenseApi[]> {
    const params = new HttpParams()
      .set('familyId', String(this.getFamilyId()))
      .set('month', month ?? this.currentMonthKey());
    const withCategory = categoryId && categoryId > 0
      ? params.set('categoryId', String(categoryId))
      : params;
    return this.get<ExpenseApi[]>('/expense/expenses', withCategory);
  }

  getExpenseMonthlySummary(month?: string): Observable<ExpenseSummaryApi> {
    const params = new HttpParams()
      .set('familyId', String(this.getFamilyId()))
      .set('month', month ?? this.currentMonthKey());
    return this.get<ExpenseSummaryApi>('/expense/expenses/summary', params);
  }

  getExpenseDailySummary(date?: string): Observable<ExpenseDailySummaryApi> {
    let params = new HttpParams().set('familyId', String(this.getFamilyId()));
    if (date?.trim()) {
      params = params.set('date', date.trim());
    }
    return this.get<ExpenseDailySummaryApi>('/expense/expenses/summary/daily', params);
  }

  getExpenseCategoryReport(month?: string): Observable<ExpenseCategoryReportApi> {
    const params = new HttpParams()
      .set('familyId', String(this.getFamilyId()))
      .set('month', month ?? this.currentMonthKey());
    return this.get<ExpenseCategoryReportApi>('/expense/expenses/reports/categories', params);
  }

  getExpenseBudgets(): Observable<ExpenseBudgetApi[]> {
    const params = new HttpParams().set('familyId', String(this.getFamilyId()));
    return this.get<ExpenseBudgetApi[]>('/expense/budgets', params);
  }

  createExpenseBudget(input: { month: string; limitAmount: number }): Observable<void> {
    const familyId = this.getFamilyId();
    return this.post<void>('/expense/budgets', {
      familyId,
      month: input.month,
      limitAmount: input.limitAmount
    }).pipe(map(() => undefined));
  }

  updateExpenseBudget(budgetId: number, input: { limitAmount: number }): Observable<void> {
    return this.put<void>(`/expense/budgets/${budgetId}`, {
      limitAmount: input.limitAmount
    }).pipe(map(() => undefined));
  }

  getExpenseProposals(): Observable<ExpenseProposalApi[]> {
    const params = new HttpParams().set('familyId', String(this.getFamilyId()));
    return this.get<ExpenseProposalApi[]>('/expense/proposals', params);
  }

  createExpenseProposal(input: {
    title: string;
    amount: number;
    categoryName: string;
    proposedBy: string;
    approver: string;
  }): Observable<ExpenseProposalApi> {
    const familyId = this.getFamilyId();
    return this.post<ExpenseProposalApi>('/expense/proposals', {
      familyId,
      title: input.title,
      amount: input.amount,
      categoryName: input.categoryName,
      proposedBy: input.proposedBy,
      approver: input.approver
    });
  }

  approveExpenseProposal(proposalId: number, approver: string): Observable<ExpenseProposalApi> {
    const params = new HttpParams().set('approver', approver);
    return this.http.put<ApiEnvelope<ExpenseProposalApi>>(`${this.apiBase}/expense/proposals/${proposalId}/approve`, {}, { params }).pipe(
      map(resp => {
        if (!resp.success) throw new Error(resp.message || 'API error');
        return resp.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  rejectExpenseProposal(proposalId: number, rejectReason: string, approver: string): Observable<ExpenseProposalApi> {
    const params = new HttpParams().set('approver', approver);
    return this.http.put<ApiEnvelope<ExpenseProposalApi>>(`${this.apiBase}/expense/proposals/${proposalId}/reject`, {
      rejectReason
    }, { params }).pipe(
      map(resp => {
        if (!resp.success) throw new Error(resp.message || 'API error');
        return resp.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  resubmitExpenseProposal(
    proposalId: number,
    input: {
      title: string;
      amount: number;
      categoryName: string;
      approver: string;
    },
    proposer: string
  ): Observable<ExpenseProposalApi> {
    const params = new HttpParams().set('proposer', proposer);
    return this.http.put<ApiEnvelope<ExpenseProposalApi>>(`${this.apiBase}/expense/proposals/${proposalId}/resubmit`, {
      title: input.title,
      amount: input.amount,
      categoryName: input.categoryName,
      approver: input.approver
    }, { params }).pipe(
      map(resp => {
        if (!resp.success) throw new Error(resp.message || 'API error');
        return resp.data;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  createNotification(input: {
    userId: number | null;
    title: string;
    message: string;
    type?: string;
  }): Observable<void> {
    const familyId = this.getFamilyId();
    return this.post<void>('/notification/api/notifications', {
      familyId,
      userId: input.userId,
      channel: 'PUSH',
      type: input.type ?? 'SYSTEM',
      title: input.title,
      message: input.message,
      scheduledAt: new Date().toISOString()
    }).pipe(map(() => undefined));
  }

  getExpenseCategories(familyId?: number): Observable<ExpenseCategoryApi[]> {
    const params = new HttpParams().set('familyId', String(familyId ?? this.getFamilyId()));
    return this.get<ExpenseCategoryApi[]>('/expense/categories', params);
  }

  deleteExpenseCategory(categoryId: number): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiBase}/expense/categories/${categoryId}`)
      .pipe(
        map(() => undefined),
        catchError(this.handleError)
      );
  }

  getExchangeRates(familyId?: number): Observable<ExchangeRateApi[]> {
    const params = new HttpParams().set('familyId', String(familyId ?? this.getFamilyId()));
    return this.get<ExchangeRateApi[]>('/expense/exchange-rates', params);
  }

  convertCurrencyToVnd(input: { fromCurrency: string; amount: number; familyId?: number }): Observable<ConvertCurrencyResponseApi> {
    return this.post<ConvertCurrencyResponseApi>('/expense/exchange-rates/convert', {
      familyId: input.familyId ?? this.getFamilyId(),
      fromCurrency: input.fromCurrency,
      amount: input.amount
    });
  }

  createTask(input: {
    title: string;
    description: string;
    dueAt?: string;
    assigneeUserId?: number | null;
    createdByUserId?: number | null;
  }): Observable<void> {
    const familyId = this.getFamilyId();
    return this.post('/task/tasks', {
      familyId,
      title: input.title,
      description: input.description,
      assigneeUserId: input.assigneeUserId ?? null,
      createdByUserId: input.createdByUserId ?? this.getUserId(),
      dueAt: input.dueAt ?? null
    }).pipe(map(() => undefined));
  }

  completeTask(taskId: number): Observable<void> {
    return this.post(`/task/tasks/${taskId}/complete`, {}).pipe(map(() => undefined));
  }

  startTask(taskId: number): Observable<void> {
    return this.put(`/task/tasks/${taskId}`, { status: 'IN_PROGRESS' }).pipe(map(() => undefined));
  }

  assignTask(taskId: number, assigneeUserId: number): Observable<void> {
    return this.put(`/task/tasks/${taskId}`, { assigneeUserId }).pipe(map(() => undefined));
  }

  updateTaskStatus(taskId: number, status: TaskStatus): Observable<void> {
    return this.put(`/task/tasks/${taskId}`, { status }).pipe(map(() => undefined));
  }

  updateTask(
    taskId: number,
    input: { title: string; description: string; dueAt?: string; assigneeUserId?: number | null; status?: TaskStatus }
  ): Observable<void> {
    return this.put(`/task/tasks/${taskId}`, {
      title: input.title,
      description: input.description,
      assigneeUserId: input.assigneeUserId ?? null,
      dueAt: input.dueAt ?? null,
      status: input.status
    }).pipe(map(() => undefined));
  }

  deleteTask(taskId: number): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiBase}/task/tasks/${taskId}`)
      .pipe(map(() => undefined));
  }

  createShoppingItem(input: { itemName: string; quantity: string; note: string }): Observable<void> {
    const familyId = this.getFamilyId();

    return this.ensureShoppingList(familyId).pipe(
      switchMap((list) =>
        this.post(`/shopping/shopping-lists/${list.id}/items`, {
          itemName: input.itemName,
          quantity: input.quantity,
          note: input.note,
          checked: false
        })
      ),
      map(() => undefined)
    );
  }

  updateShoppingItemChecked(itemId: number, checked: boolean): Observable<void> {
    return this.post(`/shopping/shopping-items/${itemId}/check`, { checked }).pipe(map(() => undefined));
  }

  createMealPlan(input: { mealName: string; mealType: MealType; planDate: string; notes: string }): Observable<void> {
    const familyId = this.getFamilyId();

    return this.ensureMeal(familyId, input.mealName, input.mealType).pipe(
      switchMap((meal) =>
        this.post('/meal/meal-plans', {
          familyId,
          mealId: meal.id,
          planDate: input.planDate,
          notes: input.notes
        })
      ),
      map(() => undefined)
    );
  }

  createBabyProfile(input: { name: string; birthDate: string; gender: BabyGender; notes: string }): Observable<void> {
    const familyId = this.getFamilyId();

    return this.post('/baby/babies', {
      familyId,
      name: input.name,
      birthDate: input.birthDate,
      gender: input.gender,
      notes: input.notes
    }).pipe(map(() => undefined));
  }

  getBabies(): Observable<BabyProfile[]> {
    const params = new HttpParams().set('familyId', String(this.getFamilyId()));
    return this.get<BabyProfile[]>('/baby/babies', params);
  }

  getBabySummary(babyId: number, date?: string): Observable<BabyDailySummary> {
    let params = new HttpParams();
    if (date?.trim()) {
      params = params.set('date', date.trim());
    }
    return this.get<BabyDailySummary>(`/baby/babies/${babyId}/summary`, params);
  }

  getBabyDashboard(input: {
    babyId: number;
    date?: string;
    trendDays?: number;
    recentLogLimit?: number;
    upcomingVaccineLimit?: number;
  }): Observable<BabyDashboard> {
    let params = new HttpParams();
    if (input.date?.trim()) {
      params = params.set('date', input.date.trim());
    }
    if (input.trendDays !== undefined && Number.isFinite(input.trendDays)) {
      params = params.set('trendDays', String(input.trendDays));
    }
    if (input.recentLogLimit !== undefined && Number.isFinite(input.recentLogLimit)) {
      params = params.set('recentLogLimit', String(input.recentLogLimit));
    }
    if (input.upcomingVaccineLimit !== undefined && Number.isFinite(input.upcomingVaccineLimit)) {
      params = params.set('upcomingVaccineLimit', String(input.upcomingVaccineLimit));
    }
    return this.get<BabyDashboard>(`/baby/babies/${input.babyId}/dashboard`, params);
  }

  getBabyLogs(babyId: number, date?: string): Observable<BabyLogEntry[]> {
    let params = new HttpParams();
    if (date?.trim()) {
      params = params.set('date', date.trim());
    }
    return this.get<BabyLogEntry[]>(`/baby/babies/${babyId}/logs`, params);
  }

  getBabyLogComments(logId: number): Observable<BabyLogComment[]> {
    return this.get<BabyLogComment[]>(`/baby/babies/logs/${logId}/comments`);
  }

  createBabyLogComment(logId: number, content: string, parentId?: number | null, taggedUserIds?: number[]): Observable<BabyLogComment> {
    return this.post<BabyLogComment>(`/baby/babies/logs/${logId}/comments`, { 
      content,
      parentId: parentId || null,
      taggedUserIds: taggedUserIds || []
    });
  }

  deleteBabyLogComment(commentId: number): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiBase}/baby/babies/logs/comments/${commentId}`)
      .pipe(
        map((response) => {
          if (!response.success) throw new Error(response.message || 'API error');
          return undefined;
        }),
        catchError(this.handleError)
      );
  }

  reactBabyLogComment(commentId: number, reactionType: string): Observable<void> {
    const params = new HttpParams().set('type', reactionType);
    return this.http
      .post<ApiEnvelope<void>>(`${this.apiBase}/baby/babies/logs/comments/${commentId}/react`, {}, { params })
      .pipe(
        map((response) => {
          if (!response.success) throw new Error(response.message || 'API error');
          return undefined;
        }),
        catchError(this.handleError)
      );
  }

  unreactBabyLogComment(commentId: number): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiBase}/baby/babies/logs/comments/${commentId}/react`)
      .pipe(
        map((response) => {
          if (!response.success) throw new Error(response.message || 'API error');
          return undefined;
        }),
        catchError(this.handleError)
      );
  }

  getVaccinations(babyId: number): Observable<BabyVaccination[]> {
    return this.get<BabyVaccination[]>(`/baby/babies/${babyId}/vaccinations`);
  }

  createVaccination(input: {
    babyId: number;
    vaccineName: string;
    dueDate: string;
    completed?: boolean;
    notes?: string;
  }): Observable<void> {
    return this.post(`/baby/babies/${input.babyId}/vaccinations`, {
      vaccineName: input.vaccineName,
      dueDate: input.dueDate,
      completed: input.completed ?? false,
      notes: input.notes ?? ''
    }).pipe(map(() => undefined));
  }

  getGrowthRecords(babyId: number): Observable<BabyGrowthRecord[]> {
    return this.get<BabyGrowthRecord[]>(`/baby/babies/${babyId}/growth-records`);
  }

  createGrowthRecord(input: {
    babyId: number;
    measuredAt: string;
    weightKg?: number | null;
    heightCm?: number | null;
    headCircumferenceCm?: number | null;
    notes?: string;
  }): Observable<void> {
    return this.post(`/baby/babies/${input.babyId}/growth-records`, {
      measuredAt: input.measuredAt,
      weightKg: input.weightKg ?? null,
      heightCm: input.heightCm ?? null,
      headCircumferenceCm: input.headCircumferenceCm ?? null,
      notes: input.notes ?? ''
    }).pipe(map(() => undefined));
  }

  createBabyLog(input: {
    logType: BabyLogType;
    value?: number;
    note?: string;
    babyId?: number | null;
    loggedAt?: string;
  }): Observable<void> {
    const payload = {
      logType: input.logType,
      value: input.value ?? 0,
      note: input.note ?? '',
      loggedAt: input.loggedAt ?? new Date().toISOString()
    };

    if (input.babyId) {
      return this.post(`/baby/babies/${input.babyId}/logs`, payload).pipe(map(() => undefined));
    }

    return this.getBabies().pipe(
      map((babies) => babies[0] ?? null),
      switchMap((baby) => {
        if (!baby) {
          throw new Error('No baby profile found.');
        }
        return this.post(`/baby/babies/${baby.id}/logs`, payload).pipe(map(() => undefined));
      })
    );
  }

  createFamilyMember(input: {
    username: string;
    email: string;
    displayName: string;
    role: FamilyRole;
    relation?: FamilyRelation;
    parentUserId?: number | null;
    dateOfBirth?: string | null;
  }): Observable<void> {
    const familyId = this.getFamilyId();

    return this.post(`/account/families/${familyId}/members/invite`, {
      username: input.username,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      relation: input.relation,
      parentUserId: input.parentUserId ?? null,
      dateOfBirth: input.dateOfBirth ?? null
    }).pipe(map(() => undefined));
  }

  updateFamilyMemberRole(userId: number, role: FamilyRole): Observable<void> {
    const familyId = this.getFamilyId();
    const url = `/account/families/${familyId}/members/${userId}/role?role=${role}`;
    return this.put<void>(url, {}).pipe(map(() => undefined));
  }

  removeFamilyMember(userId: number): Observable<void> {
    const familyId = this.getFamilyId();
    return this.http.delete<ApiEnvelope<unknown>>(`${this.apiBase}/account/families/${familyId}/members/${userId}`).pipe(
      map(() => undefined)
    );
  }

  updateFamilyMember(userId: number, input: {
    displayName: string;
    username: string;
    email: string;
    role: FamilyRole;
    relation: FamilyRelation;
    parentUserId?: number | null;
    dateOfBirth?: string | null;
  }): Observable<void> {
    const familyId = this.getFamilyId();
    return this.put<void>(`/account/families/${familyId}/members/${userId}`, {
      displayName: input.displayName,
      username: input.username,
      email: input.email,
      role: input.role,
      relation: input.relation,
      parentUserId: input.parentUserId ?? null,
      dateOfBirth: input.dateOfBirth ?? null
    }).pipe(map(() => undefined));
  }

  getNotificationSettings(): NotificationSettings {
    if (typeof window === 'undefined') {
      return { notificationEnabled: true, reminderHour: '20:30' };
    }

    const raw = window.localStorage.getItem(this.settingsStorageKey);
    if (!raw) {
      return { notificationEnabled: true, reminderHour: '20:30' };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
      return {
        notificationEnabled: parsed.notificationEnabled ?? true,
        reminderHour: parsed.reminderHour ?? '20:30'
      };
    } catch {
      return { notificationEnabled: true, reminderHour: '20:30' };
    }
  }

  saveNotificationSettings(enabled: boolean, reminderHour: string): Observable<void> {
    const settings: NotificationSettings = {
      notificationEnabled: enabled,
      reminderHour: reminderHour || '20:30'
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.settingsStorageKey, JSON.stringify(settings));
    }

    if (!enabled) {
      return of(undefined);
    }

    const familyId = this.getFamilyId();
    const userId = this.getUserId();
    const scheduledAt = this.buildScheduleIso(reminderHour);

    return this.post('/notification/api/notifications', {
      familyId,
      userId,
      channel: 'PUSH',
      type: 'REMINDER',
      title: 'Daily Family Digest',
      message: `Family reminder scheduled at ${reminderHour}`,
      metadataJson: JSON.stringify({ reminderHour }),
      scheduledAt
    }).pipe(map(() => undefined));
  }

  saveUserPreferences(userId: number, prefs: { theme?: string, themeAccent?: string, themeDensity?: string, themeRadius?: string, themeCustomPrimary?: string, themeCustomSecondary?: string, language?: string, currency?: string, startOfWeek?: string, notificationEnabled?: boolean, reminderTime?: string }): Observable<void> {
    return this.put(`/account/users/${userId}/preferences`, { preferences: prefs }).pipe(map(() => undefined));
  }

  getUserPreferences(userId: number): Observable<any> {
    return this.get<any>(`/account/users/${userId}/preferences`);
  }

  updateProfile(userId: number, input: { displayName: string; email: string; dateOfBirth: string | null }): Observable<any> {
    return this.put(`/account/users/${userId}`, input);
  }

  getProfilePdfBlob(userId: number): Observable<Blob> {
    return this.http.get(`${this.apiBase}/account/users/${userId}/pdf`, { responseType: 'blob' });
  }

  uploadFile(file: File, bucket: string, tag?: string): Observable<FileMetadata> {
    const familyId = this.getFamilyId();
    const userId = this.getUserId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('familyId', String(familyId));
    if (userId) {
      formData.append('userId', String(userId));
    }
    if (bucket.trim()) {
      formData.append('bucket', bucket.trim());
    }
    if (tag?.trim()) {
      formData.append('tag', tag.trim());
    }

    return this.http
      .post<ApiEnvelope<FileMetadata>>(`${this.apiBase}/file/files/upload`, formData)
      .pipe(map((response) => response.data));
  }

  getFiles(bucket: string, tag?: string): Observable<FileMetadata[]> {
    let params = new HttpParams().set('familyId', String(this.getFamilyId()));
    if (bucket.trim()) {
      params = params.set('bucket', bucket.trim());
    }
    if (tag?.trim()) {
      params = params.set('tag', tag.trim());
    }
    return this.get<FileMetadata[]>('/file/files', params);
  }

  getFileDownloadUrl(fileId: number): Observable<string> {
    return this.get<{ fileId: number; downloadUrl: string; expirySeconds: number }>(
      `/file/files/${fileId}/download-url`,
      new HttpParams().set('expirySeconds', '900')
    ).pipe(map((data) => data.downloadUrl));
  }

  getFileViewBlob(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiBase}/file/files/${fileId}/view`, { responseType: 'blob' });
  }

  deleteFile(fileId: number): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiBase}/file/files/${fileId}`, {
        params: new HttpParams().set('deleteObject', 'true')
      })
      .pipe(map(() => undefined));
  }

  private ensureExpenseCategory(familyId: number, rawCategoryName: string): Observable<ExpenseCategoryApi> {
    const normalized = rawCategoryName.trim();

    return this.getExpenseCategories(familyId).pipe(
      switchMap((categories) => {
        const existing = categories.find((category) => category.name.toLowerCase() === normalized.toLowerCase());
        if (existing) {
          return of(existing);
        }

        return this.post<ExpenseCategoryApi>('/expense/categories', {
          familyId,
          name: normalized,
          colorCode: '#F59E0B',
          defaultCategory: false
        });
      })
    );
  }

  private ensureShoppingList(familyId: number): Observable<ShoppingListApi> {
    const params = new HttpParams().set('familyId', String(familyId)).set('activeOnly', 'true');
    return this.get<ShoppingListApi[]>('/shopping/shopping-lists', params).pipe(
      switchMap((lists) => {
        const firstActive = lists[0];
        if (firstActive) {
          return of(firstActive);
        }

        return this.post<ShoppingListApi>('/shopping/shopping-lists', {
          familyId,
          name: 'Default List',
          active: true
        });
      })
    );
  }

  private ensureMeal(familyId: number, rawMealName: string, mealType: MealType): Observable<MealApi> {
    const mealName = rawMealName.trim();

    return this.getMeals(familyId).pipe(
      switchMap((meals) => {
        const existing = meals.find(
          (meal) => meal.name.toLowerCase() === mealName.toLowerCase() && meal.mealType === mealType
        );
        if (existing) {
          return of(existing);
        }

        return this.post<MealApi>('/meal/meals', {
          familyId,
          name: mealName,
          mealType,
          description: ''
        });
      })
    );
  }

  private getMeals(familyId: number): Observable<MealApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<MealApi[]>('/meal/meals', params);
  }

  private enrichFamilyMembers(members: FamilyMemberApi[]): Observable<FamilyMemberProfile[]> {
    if (members.length === 0) {
      return of([]);
    }

    return forkJoin(
      members.map((member) =>
        this.get<UserApi>(`/account/users/${member.userId}`).pipe(
          map((user) => {
            const relation = member.relation ?? this.defaultRelationByRole(member.role);
            return {
              userId: user.id,
              displayName: user.displayName?.trim() || member.displayName?.trim() || `#${member.userId}`,
              username: user.username?.trim() || '-',
              email: user.email?.trim() || '-',
              role: member.role,
              relation,
              parentUserId: member.parentUserId ?? null,
              avatarUrl: this.buildAvatarUrl(member.userId),
              dateOfBirth: user.dateOfBirth ?? member.dateOfBirth ?? null
            };
          }),
          catchError(() => {
            const relation = member.relation ?? this.defaultRelationByRole(member.role);
            return of({
              userId: member.userId,
              displayName: member.displayName?.trim() || `#${member.userId}`,
              username: '-',
              email: '-',
              role: member.role,
              relation,
              parentUserId: member.parentUserId ?? null,
              avatarUrl: this.buildAvatarUrl(member.userId),
              dateOfBirth: member.dateOfBirth ?? null
            });
          })
        )
      )
    );
  }

  private resolveCurrentAccountUser(): Observable<UserApi | null> {
    const userId = this.getUserId();
    if (userId) {
      return this.get<UserApi>(`/account/users/${userId}`).pipe(
        map((user) => {
          this.persistResolvedUser(user);
          return user;
        }),
        catchError(() => this.lookupAccountUserByIdentity())
      );
    }

    return this.lookupAccountUserByIdentity();
  }

  private lookupAccountUserByIdentity(): Observable<UserApi | null> {
    const username = this.getStored('atg_username')?.trim();
    const email = this.getStored('atg_email')?.trim();
    if (!username && !email) {
      return of(null);
    }

    let params = new HttpParams();
    if (username) {
      params = params.set('username', username);
    }
    if (email) {
      params = params.set('email', email);
    }

    return this.get<UserApi>('/account/users/lookup', params).pipe(
      map((user) => {
        this.persistResolvedUser(user);
        return user;
      }),
      catchError(() => of(null))
    );
  }

  private resolveFamilyIdForUser(userId: number): Observable<number> {
    const storedFamilyId = this.getStoredFamilyId();

    return this.get<FamilyApi[]>(`/account/users/${userId}/families`).pipe(
      map((families) => {
        const fallback = storedFamilyId ?? API_CONFIG.DEFAULT_FAMILY_ID;
        if (!families || families.length === 0) {
          return fallback;
        }

        const selected = storedFamilyId && families.some((family) => family.id === storedFamilyId)
          ? storedFamilyId
          : families[0].id;
        this.persistFamilyId(selected);
        return selected;
      }),
      catchError(() => of(storedFamilyId ?? API_CONFIG.DEFAULT_FAMILY_ID))
    );
  }

  private getStoredFamilyId(): number | null {
    const raw = this.getStored('mom_family_id') ?? this.getStored('atg_family_id');
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private persistFamilyId(familyId: number): void {
    if (typeof window === 'undefined') {
      return;
    }
    const value = String(familyId);
    window.localStorage.setItem('mom_family_id', value);
    window.localStorage.setItem('atg_family_id', value);
    window.sessionStorage.setItem('mom_family_id', value);
    window.sessionStorage.setItem('atg_family_id', value);
  }

  private persistResolvedUser(user: UserApi): void {
    if (typeof window === 'undefined') {
      return;
    }

    const useSession = !!window.sessionStorage.getItem('atg_access_token') && !window.localStorage.getItem('atg_access_token');
    const targetStorage = useSession ? window.sessionStorage : window.localStorage;
    const mirrorStorage = useSession ? window.localStorage : window.sessionStorage;

    targetStorage.setItem('atg_user_id', String(user.id));
    targetStorage.setItem('atg_username', user.username);
    targetStorage.setItem('atg_email', user.email);

    mirrorStorage.removeItem('atg_user_id');
    mirrorStorage.removeItem('atg_username');
    mirrorStorage.removeItem('atg_email');
  }

  private getStored(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  }

  private resolveAvatarUrl(avatarUrl: string | null): string | null {
    const raw = avatarUrl?.trim();
    if (raw) {
      if (/^https?:\/\//i.test(raw)) {
        return raw;
      }
      if (raw.startsWith('/auth/')) {
        return `${this.apiBase}${raw}`;
      }
      if (raw.startsWith('/account/')) {
        return `${this.apiBase}/auth${raw}`;
      }
      return `${this.apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
    }
    return null;
  }

  private buildAvatarUrl(userId: number): string {
    return `${this.apiBase}/auth/account/user/avatar/${userId}`;
  }

  private buildProfileFallback(userId: number | null, fallbackName: string, avatarUrl: string | null): ProfileInfo {
    return {
      userId,
      displayName: fallbackName,
      username: fallbackName,
      email: this.getStored('atg_email') ?? '-',
      avatarUrl
    };
  }

  private familyRoleOrder(role: FamilyRole): number {
    if (role === 'GRANDMA') {
      return 1;
    }
    if (role === 'MOM' || role === 'DAD') {
      return 2;
    }
    if (role === 'CAREGIVER') {
      return 3;
    }
    return 4;
  }

  private defaultRelationByRole(role: FamilyRole): FamilyRelation {
    if (role === 'MOM') {
      return 'ME';
    }
    if (role === 'DAD') {
      return 'BO';
    }
    if (role === 'GRANDMA') {
      return 'BA_NOI';
    }
    if (role === 'CAREGIVER') {
      return 'BAO_MAU';
    }
    return 'THANH_VIEN_KHAC';
  }

  private buildScheduleIso(reminderHour: string): string {
    const [hourRaw, minuteRaw] = reminderHour.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(Number.isFinite(hour) ? hour : 20, Number.isFinite(minute) ? minute : 30, 0, 0);

    if (scheduled.getTime() <= now.getTime()) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled.toISOString();
  }

  private currentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(`${this.apiBase}${path}`, { params })
      .pipe(
        map((response) => {
          if (!response.success) throw new Error(response.message || 'API error');
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(`${this.apiBase}${path}`, body)
      .pipe(
        map((response) => {
          if (!response.success) throw new Error(response.message || 'API error');
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  private put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiEnvelope<T>>(`${this.apiBase}${path}`, body)
      .pipe(
        map((response) => {
          if (!response.success) throw new Error(response.message || 'API error');
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  private handleError(err: any): Observable<never> {
    const message = err.error?.message || err.message || 'An unexpected error occurred';
    return throwError(() => new Error(message));
  }

  parseExcelFile(file: File): Observable<ExcelParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiEnvelope<ExcelParseResponse>>(`${this.apiBase}/file/files/parse/excel`, formData).pipe(
      map((response) => {
        if (!response.success) throw new Error(response.message || 'API error');
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  parseDocxFile(file: File): Observable<DocumentParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiEnvelope<DocumentParseResponse>>(`${this.apiBase}/file/files/parse/docx`, formData).pipe(
      map((response) => {
        if (!response.success) throw new Error(response.message || 'API error');
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  parsePdfFile(file: File): Observable<DocumentParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiEnvelope<DocumentParseResponse>>(`${this.apiBase}/file/files/parse/pdf`, formData).pipe(
      map((response) => {
        if (!response.success) throw new Error(response.message || 'API error');
        return response.data;
      }),
      catchError(this.handleError)
    );
  }

  importExpensesBatch(expenses: any[]): Observable<BatchImportResponse> {
    return this.post<BatchImportResponse>('/file/files/import/expenses', {
      familyId: this.getFamilyId(),
      expenses: expenses
    });
  }

  importBabiesBatch(babies: any[]): Observable<BatchImportResponse> {
    return this.post<BatchImportResponse>('/file/files/import/babies', {
      familyId: this.getFamilyId(),
      babies: babies
    });
  }

  createJourneyEvent(babyId: number, event: JourneyEventApi): Observable<JourneyEventApi> {
    return this.post<JourneyEventApi>(`/baby/babies/${babyId}/journey-events`, event);
  }

  getJourneyEvents(babyId: number): Observable<JourneyEventApi[]> {
    return this.get<JourneyEventApi[]>(`/baby/babies/${babyId}/journey-events`).pipe(
      map((items) => items ?? []),
      catchError(() => of([]))
    );
  }

  deleteJourneyEvent(babyId: number, eventId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.apiBase}/baby/babies/${babyId}/journey-events/${eventId}`)
      .pipe(
        map(() => undefined),
        catchError(this.handleError)
      );
  }
}
