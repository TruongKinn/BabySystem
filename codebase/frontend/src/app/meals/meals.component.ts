import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { MealType, SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';
import { API_CONFIG } from '../shared/constants/api.constant';

export type ViewMode = 'week' | 'month' | 'year';

export interface MealDayEntry {
  date: string;
  dayLabel: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snack: string[];
  totalMeals: number;
}

export interface AiSuggestedDish {
  name: string;
  description: string;
  ingredients: string[];
  mealType: MealType;
  selected?: boolean;
}

@Component({
  selector: 'app-meals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule,
    NzSelectModule,
    NzEmptyModule,
    NzTagModule,
    NzDividerModule,
    NzToolTipModule,
    NzRadioModule,
    NzBadgeModule,
  ],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.css'
})
export class MealsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  viewMode: ViewMode = 'week';
  selectedWeek: Date = new Date();
  selectedMonth: Date = new Date();
  selectedYear: Date = new Date();

  mealDays: MealDayEntry[] = [];
  isLoading = false;
  loadingCards: number[] = [];
  readonly aiLoadingCards = Array.from({ length: 6 }, (_, i) => i);

  private loadMealsSub?: Subscription;
  private aiSearchTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private activeLoadKey = '';
  private activeRangeEndpoint: '/meal/meal-plans' | '/meal/meal-plans/range' = '/meal/meal-plans';

  isCreateModalVisible = false;
  isSubmitting = false;
  applyMode: 'day' | 'week' = 'day';

  readonly createMealPlanForm = this.fb.group({
    planDate: [null as Date | null, [Validators.required]],
    notes: ['', [Validators.maxLength(500)]],
    dishes: this.fb.array([this.createDishRow()])
  });

  isAiModalVisible = false;
  aiIngredients = '';
  isAiLoading = false;
  aiSuggestions: AiSuggestedDish[] = [];
  aiTargetDate: Date | null = null;
  aiApplyMode: 'day' | 'week' = 'day';
  aiApplyMealType: MealType = 'DINNER';
  isAddingFromAi = false;

  ngOnInit(): void {
    this.loadingCards = this.buildLoadingCards();
    this.loadMeals(true);
  }

  ngOnDestroy(): void {
    this.loadMealsSub?.unsubscribe();
    if (this.aiSearchTimeoutId) {
      clearTimeout(this.aiSearchTimeoutId);
      this.aiSearchTimeoutId = null;
    }
  }

  get dishesArray(): FormArray {
    return this.createMealPlanForm.get('dishes') as FormArray;
  }

  onViewModeChange(): void {
    this.loadingCards = this.buildLoadingCards();
    this.loadMeals();
  }

  onWeekChange(date: Date | null): void {
    if (!date) return;
    this.selectedWeek = date;
    this.loadMeals();
  }

  onMonthChange(date: Date | null): void {
    if (!date) return;
    this.selectedMonth = date;
    this.loadMeals();
  }

  onYearChange(date: Date | null): void {
    if (!date) return;
    this.selectedYear = date;
    this.loadMeals();
  }

  onWeekPickerOpenChange(open: boolean): void {
    if (!open) {
      this.loadMeals();
    }
  }

  onMonthPickerOpenChange(open: boolean): void {
    if (!open) {
      this.loadMeals();
    }
  }

  onYearPickerOpenChange(open: boolean): void {
    if (!open) {
      this.loadMeals();
    }
  }

  loadMeals(force = false): void {
    const familyId = this.command.getFamilyId();
    const { startDate, endDate } = this.getCurrentRange();

    const loadKey = `${this.viewMode}|${startDate}|${endDate}|${familyId}`;
    if (!force && this.activeLoadKey === loadKey) {
      return;
    }

    this.activeLoadKey = loadKey;
    this.isLoading = true;
    this.loadMealsSub?.unsubscribe();

    const request$ = this.viewMode === 'week'
      ? this.fetchWeekMealDays(familyId, startDate, endDate)
      : this.fetchRangeMealDays(familyId, startDate, endDate);

    this.loadMealsSub = request$
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe((days) => {
        this.mealDays = days;
      });
  }

  get periodLabel(): string {
    if (this.viewMode === 'week') {
      const range = this.getWeekRange(this.selectedWeek);
      return this.i18n.translate('momApp.meals.stats.period.week', {
        start: range.start,
        end: range.end,
      });
    }

    if (this.viewMode === 'month') {
      const month = String(this.selectedMonth.getMonth() + 1).padStart(2, '0');
      return this.i18n.translate('momApp.meals.stats.period.month', {
        month,
        year: this.selectedMonth.getFullYear(),
      });
    }

    return this.i18n.translate('momApp.meals.stats.period.year', {
      year: this.selectedYear.getFullYear(),
    });
  }

  createDishRow() {
    return this.fb.group({
      mealType: ['DINNER' as MealType, Validators.required],
      mealName: ['', [Validators.required, Validators.maxLength(160)]]
    });
  }

  addDish(): void {
    this.dishesArray.push(this.createDishRow());
  }

  removeDish(index: number): void {
    if (this.dishesArray.length > 1) {
      this.dishesArray.removeAt(index);
    }
  }

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
    while (this.dishesArray.length > 1) {
      this.dishesArray.removeAt(1);
    }
    this.createMealPlanForm.reset({
      planDate: null,
      notes: '',
      dishes: [{ mealType: 'DINNER', mealName: '' }]
    });
    this.applyMode = 'day';
  }

  submitCreateMealPlan(): void {
    if (this.createMealPlanForm.invalid) {
      this.createMealPlanForm.markAllAsTouched();
      return;
    }

    const planDate = this.createMealPlanForm.controls.planDate.value;
    if (!planDate) return;

    const notes = this.createMealPlanForm.controls.notes.value?.trim() ?? '';
    const dishes = this.dishesArray.controls
      .map(ctrl => ({
        mealName: ctrl.get('mealName')?.value?.trim() ?? '',
        mealType: ctrl.get('mealType')?.value as MealType
      }))
      .filter(d => d.mealName);

    if (dishes.length === 0) {
      this.notification.warning(
        this.i18n.translate('momApp.common.warning'),
        this.i18n.translate('momApp.meals.messages.requireAtLeastOneDish')
      );
      return;
    }

    const dates = this.applyMode === 'week'
      ? this.generateEmptyDays(this.getWeekRange(planDate).start, this.getWeekRange(planDate).end).map(d => d.date)
      : [this.formatLocalDate(planDate)];

    this.isSubmitting = true;
    const requests = dates.flatMap(date =>
      dishes.map(dish => this.command.createMealPlan({
        mealName: dish.mealName,
        mealType: dish.mealType,
        planDate: date,
        notes
      }))
    );

    this.executeSequential(requests, 0)
      .then(() => {
        this.isSubmitting = false;
        this.closeCreateModal();
        this.loadMeals(true);
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.meals.messages.createSuccess')
        );
      })
      .catch((err) => {
        this.isSubmitting = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.meals.messages.createFailed')
        );
      });
  }

  openAiModal(): void {
    this.isAiModalVisible = true;
    this.aiIngredients = '';
    this.aiSuggestions = [];
    this.aiTargetDate = new Date();
    this.aiApplyMode = 'day';
    this.aiApplyMealType = 'DINNER';
  }

  closeAiModal(): void {
    if (this.aiSearchTimeoutId) {
      clearTimeout(this.aiSearchTimeoutId);
      this.aiSearchTimeoutId = null;
    }
    this.isAiModalVisible = false;
    this.isAiLoading = false;
    this.aiSuggestions = [];
    this.aiIngredients = '';
  }

  askAiSuggestions(): void {
    if (!this.aiIngredients.trim()) {
      this.notification.warning(
        this.i18n.translate('momApp.common.warning'),
        this.i18n.translate('momApp.meals.messages.missingIngredients')
      );
      return;
    }

    if (this.aiSearchTimeoutId) {
      clearTimeout(this.aiSearchTimeoutId);
      this.aiSearchTimeoutId = null;
    }

    this.isAiLoading = true;
    this.aiSuggestions = [];

    const startTs = Date.now();
    const suggestions = this.generateAiSuggestions(this.aiIngredients);
    const minLoadingMs = 260;
    const delayMs = Math.max(0, minLoadingMs - (Date.now() - startTs));

    this.aiSearchTimeoutId = setTimeout(() => {
      this.aiSuggestions = suggestions;
      this.isAiLoading = false;
      this.aiSearchTimeoutId = null;
    }, delayMs);
  }

  toggleAiSelection(dish: AiSuggestedDish): void {
    dish.selected = !dish.selected;
  }

  addSelectedToMenu(): void {
    const selected = this.aiSuggestions.filter(d => d.selected);
    if (selected.length === 0) {
      this.notification.warning(
        this.i18n.translate('momApp.common.warning'),
        this.i18n.translate('momApp.meals.messages.selectAtLeastOneSuggestion')
      );
      return;
    }

    if (!this.aiTargetDate) {
      this.notification.warning(
        this.i18n.translate('momApp.common.warning'),
        this.i18n.translate('momApp.meals.messages.selectApplyDate')
      );
      return;
    }

    const dates = this.aiApplyMode === 'week'
      ? this.generateEmptyDays(this.getWeekRange(this.aiTargetDate).start, this.getWeekRange(this.aiTargetDate).end).map(d => d.date)
      : [this.formatLocalDate(this.aiTargetDate)];

    this.isAddingFromAi = true;
    const requests = dates.flatMap(date =>
      selected.map(dish => this.command.createMealPlan({
        mealName: dish.name,
        mealType: this.aiApplyMealType,
        planDate: date,
        notes: dish.description
      }))
    );

    this.executeSequential(requests, 0)
      .then(() => {
        this.isAddingFromAi = false;
        this.closeAiModal();
        this.loadMeals(true);
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.meals.messages.addFromAiSuccess', { count: selected.length })
        );
      })
      .catch((err) => {
        this.isAddingFromAi = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.meals.messages.addFromAiFailed')
        );
      });
  }

  mealTypeLabel(type: MealType): string {
    return this.i18n.translate(`momApp.meals.mealType.${type}`);
  }

  mealTypeColor(type: MealType): string {
    const colors: Record<MealType, string> = {
      BREAKFAST: 'orange',
      LUNCH: 'gold',
      DINNER: 'purple',
      SNACK: 'green'
    };
    return colors[type] ?? 'default';
  }

  get selectedAiCount(): number {
    return this.aiSuggestions.filter(d => d.selected).length;
  }

  get hasAiSelection(): boolean {
    return this.aiSuggestions.some(d => d.selected);
  }

  get totalMealsAll(): number {
    return this.mealDays.reduce((sum, d) => sum + d.totalMeals, 0);
  }

  get daysWithMeals(): number {
    return this.mealDays.filter(d => d.totalMeals > 0).length;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getWeekRange(date: Date): { start: string; end: string } {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: this.formatLocalDate(monday),
      end: this.formatLocalDate(sunday)
    };
  }

  getMonthRange(date: Date): { start: string; end: string } {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: this.formatLocalDate(start),
      end: this.formatLocalDate(end)
    };
  }

  getYearRange(date: Date): { start: string; end: string } {
    const year = date.getFullYear();
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`
    };
  }

  private getCurrentRange(): { startDate: string; endDate: string } {
    if (this.viewMode === 'week') {
      const dates = this.getWeekRange(this.selectedWeek);
      return { startDate: dates.start, endDate: dates.end };
    }

    if (this.viewMode === 'month') {
      const dates = this.getMonthRange(this.selectedMonth);
      return { startDate: dates.start, endDate: dates.end };
    }

    const dates = this.getYearRange(this.selectedYear);
    return { startDate: dates.start, endDate: dates.end };
  }

  private fetchWeekMealDays(familyId: number, startDate: string, endDate: string): Observable<MealDayEntry[]> {
    const params = new HttpParams()
      .set('familyId', String(familyId))
      .set('date', startDate);

    return this.http.get<any>(`${API_CONFIG.GATEWAY_URL}/meal/meal-plans/weekly`, { params }).pipe(
      map((response) => {
        const apiData = response?.data ?? response;
        const weekStart = apiData?.weekStart ?? startDate;
        const weekEnd = apiData?.weekEnd ?? endDate;
        return this.mapApiToMealDays(apiData, weekStart, weekEnd);
      }),
      catchError(() => of(this.generateEmptyDays(startDate, endDate)))
    );
  }

  private fetchRangeMealDays(familyId: number, startDate: string, endDate: string): Observable<MealDayEntry[]> {
    const params = new HttpParams()
      .set('familyId', String(familyId))
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.requestRangeMealDays(this.activeRangeEndpoint, params, startDate, endDate).pipe(
      catchError(() => {
        const fallbackEndpoint = this.activeRangeEndpoint === '/meal/meal-plans'
          ? '/meal/meal-plans/range'
          : '/meal/meal-plans';
        return this.requestRangeMealDays(fallbackEndpoint, params, startDate, endDate).pipe(
          tap(() => { this.activeRangeEndpoint = fallbackEndpoint; }),
          catchError(() => of(this.generateEmptyDays(startDate, endDate)))
        );
      })
    );
  }

  private requestRangeMealDays(
    endpoint: '/meal/meal-plans' | '/meal/meal-plans/range',
    params: HttpParams,
    startDate: string,
    endDate: string
  ): Observable<MealDayEntry[]> {
    return this.http.get<any>(`${API_CONFIG.GATEWAY_URL}${endpoint}`, { params }).pipe(
      map((response) => {
        const apiData = response?.data ?? response;
        return this.mapApiToMealDays(apiData, startDate, endDate);
      })
    );
  }

  private mapApiToMealDays(data: any, startDate: string, endDate: string): MealDayEntry[] {
    const emptyDays = this.generateEmptyDays(startDate, endDate);
    const dayMap = new Map<string, MealDayEntry>(emptyDays.map(d => [d.date, d]));

    const plans: any[] = data?.plans ?? (Array.isArray(data) ? data : []);

    plans.forEach((plan: any) => {
      const dateKey = plan.planDate ?? plan.date ?? '';
      if (!dayMap.has(dateKey)) return;

      const entry = dayMap.get(dateKey)!;
      const mealType = this.parseMealType(plan.mealType);
      const mealName: string = plan.mealName ?? plan.name ?? '';
      if (!mealName.trim()) return;

      if (mealType === 'BREAKFAST') entry.breakfast.push(mealName);
      else if (mealType === 'LUNCH') entry.lunch.push(mealName);
      else if (mealType === 'DINNER') entry.dinner.push(mealName);
      else if (mealType === 'SNACK') entry.snack.push(mealName);
    });

    const mappedDays = Array.from(dayMap.values());
    mappedDays.forEach((entry) => this.updateDayTotal(entry));
    return mappedDays;
  }

  private generateEmptyDays(startDate: string, endDate: string): MealDayEntry[] {
    const days: MealDayEntry[] = [];
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const cursor = new Date(start);

    while (cursor <= end) {
      const dateStr = this.formatLocalDate(cursor);
      days.push({
        date: dateStr,
        dayLabel: this.formatWeekdayLabel(dateStr),
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
        totalMeals: 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  private updateDayTotal(entry: MealDayEntry): void {
    entry.totalMeals = entry.breakfast.length + entry.lunch.length + entry.dinner.length + entry.snack.length;
  }

  private buildLoadingCards(): number[] {
    const cardCount = this.viewMode === 'year' ? 12 : (this.viewMode === 'month' ? 10 : 7);
    return Array.from({ length: cardCount }, (_, i) => i);
  }

  private formatWeekdayLabel(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayName = weekdays[date.getDay()];
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayName} ${d}/${m}`;
  }

  private executeSequential(requests: Observable<void>[], index: number): Promise<void> {
    if (index >= requests.length) return Promise.resolve();
    return new Promise((resolve, reject) => {
      requests[index].subscribe({
        next: () => this.executeSequential(requests, index + 1).then(resolve).catch(reject),
        error: reject
      });
    });
  }

  private generateAiSuggestions(ingredients: string): AiSuggestedDish[] {
    const ingredientList = ingredients.toLowerCase().split(/[,\n]+/).map(s => s.trim()).filter(Boolean);

    const allDishes: AiSuggestedDish[] = [
      {
        name: 'Chicken porridge',
        description: 'Light and warm porridge for breakfast.',
        ingredients: ['chicken', 'rice', 'ginger', 'spring onion'],
        mealType: 'BREAKFAST',
        selected: false
      },
      {
        name: 'Tofu tomato stew',
        description: 'Savory tofu with fresh tomato sauce.',
        ingredients: ['tofu', 'tomato', 'onion', 'garlic'],
        mealType: 'DINNER',
        selected: false
      },
      {
        name: 'Mixed vegetable soup',
        description: 'Healthy seasonal vegetables in clear broth.',
        ingredients: ['carrot', 'pumpkin', 'green beans', 'spring onion'],
        mealType: 'LUNCH',
        selected: false
      },
      {
        name: 'Fried rice',
        description: 'Classic fried rice with eggs and vegetables.',
        ingredients: ['rice', 'egg', 'carrot', 'peas'],
        mealType: 'LUNCH',
        selected: false
      },
      {
        name: 'Lemongrass chicken',
        description: 'Fragrant stir-fried chicken with lemongrass.',
        ingredients: ['chicken', 'lemongrass', 'chili', 'garlic'],
        mealType: 'DINNER',
        selected: false
      },
      {
        name: 'Fruit yogurt cup',
        description: 'Simple healthy snack with fruits and yogurt.',
        ingredients: ['yogurt', 'banana', 'apple', 'berry'],
        mealType: 'SNACK',
        selected: false
      },
    ];

    const matched = allDishes.filter(dish =>
      dish.ingredients.some(ing =>
        ingredientList.some(userIng =>
          ing.includes(userIng) || userIng.includes(ing)
        )
      )
    );

    return matched.length >= 2 ? matched : allDishes;
  }

  private parseMealType(value: unknown): MealType {
    if (typeof value !== 'string') {
      return 'DINNER';
    }

    const normalized = value.trim().toUpperCase();
    if (normalized === 'BREAKFAST' || normalized === 'LUNCH' || normalized === 'DINNER' || normalized === 'SNACK') {
      return normalized;
    }

    return 'DINNER';
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
