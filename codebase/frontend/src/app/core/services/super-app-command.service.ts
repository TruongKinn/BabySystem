import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ExpenseCategoryApi {
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

interface BabyApi {
  id: number;
  familyId: number;
  name: string;
  birthDate: string;
  gender: BabyGender;
  notes: string | null;
}

interface UserApi {
  id: number;
  username: string;
  email: string;
  displayName: string;
}

interface ExpenseApi {
  id: number;
  familyId: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  currency: string;
  note: string | null;
  spentAt: string;
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

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type BabyGender = 'MALE' | 'FEMALE' | 'OTHER';
export type BabyLogType = 'SLEEP' | 'FEEDING' | 'DIAPER';
export type FamilyRole = 'MOM' | 'DAD' | 'GRANDMA' | 'CAREGIVER' | 'ADMIN';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

@Injectable({
  providedIn: 'root'
})
export class SuperAppCommandService {
  private readonly apiBase = API_CONFIG.GATEWAY_URL;
  private readonly settingsStorageKey = 'mom_settings';

  constructor(private readonly http: HttpClient) {}

  getFamilyId(): number {
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

  getUserId(): number | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem('atg_user_id');
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  getProfile(): Observable<{
    userId: number | null;
    displayName: string;
    username: string;
    email: string;
    avatarUrl: string | null;
  }> {
    const userId = this.getUserId();
    const fallbackName = this.getStored('atg_username') ?? 'Family User';
    const fallbackAvatar = this.resolveAvatarUrl(this.getStored('atg_avatar_url'));

    if (!userId) {
      return of({
        userId: null,
        displayName: fallbackName,
        username: fallbackName,
        email: this.getStored('atg_email') ?? '-',
        avatarUrl: fallbackAvatar
      });
    }

    return this.get<UserApi>(`/account/users/${userId}`).pipe(
      map((user) => ({
        userId: user.id,
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        avatarUrl: fallbackAvatar ?? this.buildAvatarUrl(user.id)
      })),
      catchError(() =>
        of({
          userId,
          displayName: fallbackName,
          username: fallbackName,
          email: this.getStored('atg_email') ?? '-',
          avatarUrl: fallbackAvatar ?? this.buildAvatarUrl(userId)
        })
      )
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

  getExpenses(month?: string): Observable<ExpenseApi[]> {
    const params = new HttpParams()
      .set('familyId', String(this.getFamilyId()))
      .set('month', month ?? this.currentMonthKey());
    return this.get<ExpenseApi[]>('/expense/expenses', params);
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

  getBabies(): Observable<BabyApi[]> {
    const params = new HttpParams().set('familyId', String(this.getFamilyId()));
    return this.get<BabyApi[]>('/baby/babies', params);
  }

  createBabyLog(input: { logType: BabyLogType; value?: number; note?: string; babyId?: number | null }): Observable<void> {
    const payload = {
      logType: input.logType,
      value: input.value ?? 0,
      note: input.note ?? '',
      loggedAt: new Date().toISOString()
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
  }): Observable<void> {
    const familyId = this.getFamilyId();

    return this.post<UserApi>('/account/users', {
      username: input.username,
      email: input.email,
      displayName: input.displayName
    }).pipe(
      switchMap((user) =>
        this.post(`/account/families/${familyId}/members`, {
          userId: user.id,
          role: input.role
        })
      ),
      map(() => undefined)
    );
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

  private getExpenseCategories(familyId: number): Observable<ExpenseCategoryApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<ExpenseCategoryApi[]>('/expense/categories', params);
  }

  private getMeals(familyId: number): Observable<MealApi[]> {
    const params = new HttpParams().set('familyId', String(familyId));
    return this.get<MealApi[]>('/meal/meals', params);
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
      .pipe(map((response) => response.data));
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(`${this.apiBase}${path}`, body)
      .pipe(map((response) => response.data));
  }

  private put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiEnvelope<T>>(`${this.apiBase}${path}`, body)
      .pipe(map((response) => response.data));
  }
}
