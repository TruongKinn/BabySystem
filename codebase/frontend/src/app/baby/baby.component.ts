import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzListModule } from 'ng-zorro-antd/list';
import {
  BabyCareTrendPoint,
  BabyDashboard,
  BabyForecast,
  BabyForecastAnomaly,
  BabyGender,
  BabyGrowthRecord,
  BabyLogEntry,
  BabyLogType,
  BabyProfile,
  ResolvedPremiumFeature,
  BabyVaccination,
  FileMetadata,
  SuperAppCommandService,
  BabyLogComment,
  FamilyMemberProfile
} from '../core/services/super-app-command.service';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import { I18nService } from '../i18n/i18n.service';

import { BabyCommentsComponent } from './baby-comments.component';

interface GalleryFileView extends FileMetadata {
  previewUrl: string | null;
}

@Component({
  selector: 'app-baby',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule,
    NzSelectModule,
    NzSpinModule,
    NzEmptyModule,
    NzImageModule,
    NzTagModule,
    NzListModule,
    BabyCommentsComponent
  ],
  templateUrl: './baby.component.html',
  styleUrl: './baby.component.css'
})
export class BabyComponent {
  private readonly babyGalleryBucket = 'baby-gallery';
  private readonly maxUploadImageSizeBytes = 30 * 1024 * 1024;
  private readonly advancedGrowthFeatureKey = PREMIUM_FEATURE_KEYS.advancedGrowthTracking;
  private readonly unlimitedMemoryFeatureKey = PREMIUM_FEATURE_KEYS.unlimitedMemory;
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private babyProfilesCache: BabyProfile[] = [];
  private overviewRequestKey = '';

  readonly babyProfiles$ = this.refresh$.pipe(
    switchMap(() =>
      this.command.getBabies().pipe(
        tap((babies) => {
          this.galleryLoadError = null;
          this.babyProfilesCache = babies;
          this.syncSelectedBaby(babies);
        }),
        catchError((err) => {
          this.galleryLoadError = err?.message || this.i18n.translate('momApp.baby.gallery.messages.loadFailed');
          this.babyProfilesCache = [];
          this.resetSelectedBabyState();
          return of([] as BabyProfile[]);
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly logTypes: BabyLogType[] = ['SLEEP', 'FEEDING', 'DIAPER'];
  readonly genders: BabyGender[] = ['MALE', 'FEMALE', 'OTHER'];

  isCreateBabyModalVisible = false;
  isCreateLogModalVisible = false;
  isCreateGrowthModalVisible = false;
  isCreateVaccinationModalVisible = false;

  isSubmittingBaby = false;
  isSubmittingLog = false;
  isSubmittingGrowth = false;
  isSubmittingVaccination = false;
  isUploadingGallery = false;

  isLoadingDashboard = false;
  isLoadingSelectedDateLogs = false;
  isLoadingGrowthRecords = false;
  isLoadingVaccinations = false;
  isLoadingGallery = false;
  isLoadingForecast = false;
  isRefreshingForecast = false;
  quickLogLoadingType: BabyLogType | null = null;

  dashboardLoadError: string | null = null;
  logsLoadError: string | null = null;
  growthLoadError: string | null = null;
  vaccinationLoadError: string | null = null;
  galleryLoadError: string | null = null;
  forecastLoadError: string | null = null;
  growthPremiumLocked = false;

  selectedBabyId: number | null = null;
  dashboard: BabyDashboard | null = null;
  selectedDateLogs: BabyLogEntry[] = [];
  growthRecords: BabyGrowthRecord[] = [];
  vaccinations: BabyVaccination[] = [];
  galleryFiles: GalleryFileView[] = [];
  forecast: BabyForecast | null = null;
  forecastAnomalies: BabyForecastAnomaly[] = [];
  isAnomaliesModalVisible = false;
  resolvingAnomalyId: number | null = null;
  selectedBabyAvatarUrl: string | null = null;

  familyMembers: FamilyMemberProfile[] = [];
  currentUserId: number | null = null;
  
  expandedComments: Record<number, boolean> = {};
  commentsByLogId: Record<number, BabyLogComment[]> = {};
  commentsLoading: Record<number, boolean> = {};
  commentInputs: Record<number, string> = {};
  isSubmittingComment: Record<number, boolean> = {};

  readonly selectedBabyControl = this.fb.control<number | null>(null);
  readonly selectedDateControl = this.fb.control<Date>(new Date(), { nonNullable: true });

  readonly createBabyForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    birthDate: [null as Date | null, [Validators.required]],
    gender: ['FEMALE' as BabyGender, [Validators.required]],
    notes: ['', [Validators.maxLength(600)]]
  });

  readonly createLogForm = this.fb.group({
    logType: ['SLEEP' as BabyLogType, [Validators.required]],
    value: [1],
    loggedAt: [new Date(), [Validators.required]],
    note: ['', [Validators.maxLength(500)]]
  });

  readonly createGrowthForm = this.fb.group({
    measuredAt: [new Date(), [Validators.required]],
    weightKg: [null as number | null],
    heightCm: [null as number | null],
    headCircumferenceCm: [null as number | null],
    notes: ['', [Validators.maxLength(500)]]
  });

  readonly createVaccinationForm = this.fb.group({
    vaccineName: ['', [Validators.required, Validators.maxLength(160)]],
    dueDate: [null as Date | null, [Validators.required]],
    notes: ['', [Validators.maxLength(500)]]
  });

  constructor() {
    this.loadFamilyMembersAndUser();

    this.selectedBabyControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((babyId) => {
      if (!babyId) {
        this.resetSelectedBabyState();
        return;
      }

      if (babyId === this.selectedBabyId) {
        return;
      }

      this.selectBaby(babyId);
    });

    this.selectedDateControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.selectedBabyId) {
        return;
      }
      this.loadBabyCareOverview();
    });
  }

  get selectedBaby(): BabyProfile | null {
    if (!this.selectedBabyId) {
      return null;
    }
    return this.babyProfilesCache.find((item) => item.id === this.selectedBabyId) ?? null;
  }

  get summary() {
    return this.dashboard?.dailySummary ?? null;
  }

  get dailyTrend(): BabyCareTrendPoint[] {
    return this.dashboard?.dailyTrend ?? [];
  }

  get recentLogs(): BabyLogEntry[] {
    return this.dashboard?.recentLogs ?? [];
  }

  get forecastRecommendations(): string[] {
    if (!this.forecast?.recommendationsJson) {
      return [];
    }
    try {
      const parsed = JSON.parse(this.forecast.recommendationsJson);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object' && item.key) {
            return this.i18n.translate(item.key, item.params || {});
          }
          return '';
        }).filter(val => !!val);
      }
    } catch {
      return [];
    }
    return [];
  }

  getForecastSummary(): string {
    if (!this.forecast) {
      return '';
    }
    const sleepTime = this.formatDateTime(this.forecast.sleepWindowStart);
    const feedingTime = this.formatDateTime(this.forecast.feedingWindowStart);
    return this.i18n.translate('momApp.baby.forecast.summary.' + this.forecast.riskLevel, {
      sleepTime,
      feedingTime
    });
  }

  get hasOverviewData(): boolean {
    return !!this.dashboard;
  }

  openCreateBabyModal(): void {
    this.isCreateBabyModalVisible = true;
  }

  closeCreateBabyModal(): void {
    this.isCreateBabyModalVisible = false;
    this.createBabyForm.reset({
      name: '',
      birthDate: null,
      gender: 'FEMALE',
      notes: ''
    });
  }

  openCreateLogModal(): void {
    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }

    this.createLogForm.patchValue({
      loggedAt: this.defaultLoggedAtDate(),
      value: 1,
      logType: 'SLEEP',
      note: ''
    });
    this.isCreateLogModalVisible = true;
  }

  closeCreateLogModal(): void {
    this.isCreateLogModalVisible = false;
    this.createLogForm.reset({
      logType: 'SLEEP',
      value: 1,
      loggedAt: this.defaultLoggedAtDate(),
      note: ''
    });
  }

  openCreateGrowthModal(): void {
    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }
    if (this.growthPremiumLocked) {
      this.notification.warning(this.i18n.translate('common.errorTitle'), this.growthPremiumLockMessage());
      return;
    }
    this.isCreateGrowthModalVisible = true;
  }

  closeCreateGrowthModal(): void {
    this.isCreateGrowthModalVisible = false;
    this.createGrowthForm.reset({
      measuredAt: this.selectedDateControl.value,
      weightKg: null,
      heightCm: null,
      headCircumferenceCm: null,
      notes: ''
    });
  }

  openCreateVaccinationModal(): void {
    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }
    this.isCreateVaccinationModalVisible = true;
  }

  closeCreateVaccinationModal(): void {
    this.isCreateVaccinationModalVisible = false;
    this.createVaccinationForm.reset({
      vaccineName: '',
      dueDate: null,
      notes: ''
    });
  }

  submitCreateBaby(): void {
    if (this.createBabyForm.invalid) {
      this.createBabyForm.markAllAsTouched();
      return;
    }

    const birthDate = this.createBabyForm.controls.birthDate.value;
    if (!birthDate) {
      return;
    }

    this.isSubmittingBaby = true;
    this.command
      .createBabyProfile({
        name: this.createBabyForm.controls.name.value?.trim() ?? '',
        birthDate: this.formatLocalDate(birthDate),
        gender: this.createBabyForm.controls.gender.value ?? 'FEMALE',
        notes: this.createBabyForm.controls.notes.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmittingBaby = false;
          this.closeCreateBabyModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.createBabySuccess')
          );
        },
        error: (err) => {
          this.isSubmittingBaby = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || this.i18n.translate('momApp.baby.messages.createBabyFailed')
          );
        }
      });
  }

  submitCreateLog(): void {
    if (this.createLogForm.invalid) {
      this.createLogForm.markAllAsTouched();
      return;
    }

    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }

    const valueRaw = Number(this.createLogForm.controls.value.value ?? 0);
    const loggedAt = this.createLogForm.controls.loggedAt.value;

    this.isSubmittingLog = true;
    this.command
      .createBabyLog({
        babyId: this.selectedBabyId,
        logType: this.createLogForm.controls.logType.value ?? 'SLEEP',
        value: Number.isFinite(valueRaw) ? valueRaw : 0,
        note: this.createLogForm.controls.note.value?.trim() ?? '',
        loggedAt: loggedAt ? loggedAt.toISOString() : this.buildLogTimestampForSelectedDate()
      })
      .subscribe({
        next: () => {
          this.isSubmittingLog = false;
          this.closeCreateLogModal();
          this.loadBabyCareOverview();
          this.loadForecast();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.saveLogSuccess')
          );
        },
        error: (err) => {
          this.isSubmittingLog = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || this.i18n.translate('momApp.baby.messages.createLogFailed')
          );
        }
      });
  }

  submitCreateGrowthRecord(): void {
    if (this.createGrowthForm.invalid) {
      this.createGrowthForm.markAllAsTouched();
      return;
    }

    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }
    if (this.growthPremiumLocked) {
      this.notification.warning(this.i18n.translate('common.errorTitle'), this.growthPremiumLockMessage());
      return;
    }

    const measuredAt = this.createGrowthForm.controls.measuredAt.value;
    if (!measuredAt) {
      return;
    }

    const weightKg = this.numberOrNull(this.createGrowthForm.controls.weightKg.value);
    const heightCm = this.numberOrNull(this.createGrowthForm.controls.heightCm.value);
    const headCircumferenceCm = this.numberOrNull(this.createGrowthForm.controls.headCircumferenceCm.value);

    if (weightKg === null && heightCm === null && headCircumferenceCm === null) {
      this.notification.warning(
        this.i18n.translate('common.errorTitle'),
        this.i18n.translate('momApp.baby.messages.measurementRequired')
      );
      return;
    }

    this.isSubmittingGrowth = true;
    this.command
      .createGrowthRecord({
        babyId: this.selectedBabyId,
        measuredAt: this.formatLocalDate(measuredAt),
        weightKg,
        heightCm,
        headCircumferenceCm,
        notes: this.createGrowthForm.controls.notes.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmittingGrowth = false;
          this.closeCreateGrowthModal();
          this.loadBabyCareOverview();
          this.loadMedicalData();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.growthCreateSuccess')
          );
        },
        error: (err) => {
          this.isSubmittingGrowth = false;
          if (this.isPremiumRequired(err, this.advancedGrowthFeatureKey)) {
            this.growthPremiumLocked = true;
          }
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            this.isPremiumRequired(err, this.advancedGrowthFeatureKey)
              ? this.growthPremiumLockMessage()
              : (err?.message || this.i18n.translate('momApp.baby.messages.growthCreateFailed'))
          );
        }
      });
  }

  submitCreateVaccination(): void {
    if (this.createVaccinationForm.invalid) {
      this.createVaccinationForm.markAllAsTouched();
      return;
    }

    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }

    const dueDate = this.createVaccinationForm.controls.dueDate.value;
    if (!dueDate) {
      return;
    }

    this.isSubmittingVaccination = true;
    this.command
      .createVaccination({
        babyId: this.selectedBabyId,
        vaccineName: this.createVaccinationForm.controls.vaccineName.value?.trim() ?? '',
        dueDate: this.formatLocalDate(dueDate),
        completed: false,
        notes: this.createVaccinationForm.controls.notes.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmittingVaccination = false;
          this.closeCreateVaccinationModal();
          this.loadBabyCareOverview();
          this.loadMedicalData();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.vaccinationCreateSuccess')
          );
        },
        error: (err) => {
          this.isSubmittingVaccination = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || this.i18n.translate('momApp.baby.messages.vaccinationCreateFailed')
          );
        }
      });
  }

  quickLog(logType: BabyLogType): void {
    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }
    if (this.quickLogLoadingType) {
      return;
    }

    this.quickLogLoadingType = logType;
    this.command
      .createBabyLog({
        babyId: this.selectedBabyId,
        logType,
        value: this.defaultQuickLogValue(logType),
        note: '',
        loggedAt: this.buildLogTimestampForSelectedDate()
      })
      .subscribe({
        next: () => {
          this.quickLogLoadingType = null;
          this.loadBabyCareOverview();
          this.loadForecast();
          this.notification.success(this.i18n.translate('momApp.common.success'), this.i18n.translate('momApp.baby.messages.createLogSuccess'));
        },
        error: (err) => {
          this.quickLogLoadingType = null;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || this.i18n.translate('momApp.baby.messages.createLogFailed')
          );
        }
      });
  }

  genderLabel(gender: BabyGender): string {
    return this.i18n.translate(`momApp.baby.gender.${gender}`);
  }

  logTypeLabel(logType: BabyLogType): string {
    return this.i18n.translate(`momApp.baby.logType.${logType}`);
  }

  logTypeIcon(logType: BabyLogType): string {
    if (logType === 'SLEEP') {
      return 'clock-circle';
    }
    if (logType === 'FEEDING') {
      return 'coffee';
    }
    return 'alert';
  }

  trendDayLabel(dateKey: string): string {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }
    const locale = this.i18n.getCurrentLanguage() === 'vi' ? 'vi-VN' : 'en-US';
    return date.toLocaleDateString(locale, { weekday: 'short', month: '2-digit', day: '2-digit' });
  }

  trendSleepWidth(value: number): number {
    const max = this.dailyTrend.reduce((currentMax, item) => Math.max(currentMax, item.sleepHours || 0), 0);
    if (max <= 0) {
      return 6;
    }
    return Math.max(6, Math.round((value / max) * 100));
  }

  ageLabel(birthDate: string | null | undefined): string {
    if (!birthDate) {
      return this.i18n.translate('momApp.baby.age.unknown');
    }

    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return this.i18n.translate('momApp.baby.age.unknown');
    }

    const baseDate = this.selectedDateControl.value ?? new Date();
    const days = Math.max(0, Math.floor((baseDate.getTime() - birth.getTime()) / (24 * 60 * 60 * 1000)));
    if (days < 32) {
      return this.i18n.translate(days === 1 ? 'momApp.baby.age.day' : 'momApp.baby.age.days', { count: days });
    }

    const months = Math.floor(days / 30.4375);
    if (months < 24) {
      return this.i18n.translate(months === 1 ? 'momApp.baby.age.month' : 'momApp.baby.age.months', { count: months });
    }

    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    if (remainMonths === 0) {
      return this.i18n.translate(years === 1 ? 'momApp.baby.age.year' : 'momApp.baby.age.years', { count: years });
    }
    return this.i18n.translate('momApp.baby.age.yearsMonths', { years, months: remainMonths });
  }

  vaccinationStatus(vaccination: BabyVaccination): 'completed' | 'overdue' | 'upcoming' {
    if (vaccination.completed) {
      return 'completed';
    }

    const dueDate = new Date(`${vaccination.dueDate}T00:00:00`);
    const baseDate = this.selectedDateControl.value ?? new Date();
    const cutoff = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < cutoff.getTime()) {
      return 'overdue';
    }

    return 'upcoming';
  }

  vaccinationStatusLabel(vaccination: BabyVaccination): string {
    const status = this.vaccinationStatus(vaccination);
    return this.i18n.translate(`momApp.baby.vaccination.status.${status}`);
  }

  formatDecimal(value: number | null | undefined, unit = ''): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }
    const formatted = Number(value).toFixed(1);
    return unit ? `${formatted}${unit}` : formatted;
  }

  formatGalleryFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDate(value: string | null): string {
    if (!value?.trim()) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale = this.i18n.getCurrentLanguage() === 'vi' ? 'vi-VN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatDateTime(value: string | null): string {
    if (!value?.trim()) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale = this.i18n.getCurrentLanguage() === 'vi' ? 'vi-VN' : 'en-US';
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onGalleryFileSelected(event: Event): void {
    if (!this.selectedBabyId) {
      this.notifySelectBabyFirst();
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!file.type.toLowerCase().startsWith('image/')) {
      this.notification.warning(
        this.i18n.translate('common.errorTitle'),
        this.i18n.translate('momApp.profile.messages.selectImageOnly')
      );
      return;
    }

    if (file.size > this.maxUploadImageSizeBytes) {
      this.notification.warning(
        this.i18n.translate('common.errorTitle'),
        this.i18n.translate('momApp.profile.messages.fileTooLarge')
      );
      return;
    }

    this.isUploadingGallery = true;
    this.command.uploadFile(file, this.babyGalleryBucket, `baby:${this.selectedBabyId}`).subscribe({
      next: () => {
        this.isUploadingGallery = false;
        this.loadGalleryFiles();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.baby.gallery.messages.uploadSuccess')
        );
      },
      error: (err) => {
        this.isUploadingGallery = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          this.isPremiumRequired(err, this.unlimitedMemoryFeatureKey)
            ? this.i18n.translate('momApp.baby.gallery.messages.unlimitedMemoryRequired')
            : (err?.message || this.i18n.translate('momApp.baby.gallery.messages.uploadFailed'))
        );
      }
    });
  }

  downloadGalleryFile(file: GalleryFileView): void {
    this.command.getFileDownloadUrl(file.id).subscribe({
      next: (url) => {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener');
        }
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.gallery.messages.downloadFailed')
        );
      }
    });
  }

  deleteGalleryFile(file: GalleryFileView): void {
    this.command.deleteFile(file.id).subscribe({
      next: () => {
        this.loadGalleryFiles();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.baby.gallery.messages.deleteSuccess')
        );
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.gallery.messages.deleteFailed')
        );
      }
    });
  }

  private syncSelectedBaby(babies: BabyProfile[]): void {
    if (babies.length === 0) {
      this.resetSelectedBabyState();
      return;
    }

    const selectedId = this.selectedBabyControl.value;
    const nextSelectedId = selectedId && babies.some((baby) => baby.id === selectedId) ? selectedId : babies[0].id;
    this.selectedBabyControl.setValue(nextSelectedId, { emitEvent: false });
    this.selectBaby(nextSelectedId);
  }

  private selectBaby(babyId: number): void {
    this.selectedBabyId = babyId;
    this.loadPremiumFeatures();
    this.loadBabyCareOverview();
    this.loadForecast();
    this.loadMedicalData();
    this.loadGalleryFiles();
  }

  refreshForecast(): void {
    if (!this.selectedBabyId || this.isRefreshingForecast) {
      return;
    }

    const babyId = this.selectedBabyId;
    this.isRefreshingForecast = true;
    this.command.refreshBabyForecast(babyId).subscribe({
      next: () => {
        this.isRefreshingForecast = false;
        this.notification.success('Forecast', this.i18n.translate('momApp.baby.forecast.messages.queueSuccess'));
        setTimeout(() => this.loadForecast(), 1200);
      },
      error: (err) => {
        this.isRefreshingForecast = false;
        this.notification.error(this.i18n.translate('common.errorTitle'), err?.message || this.i18n.translate('momApp.baby.forecast.messages.refreshFailed'));
      }
    });
  }

  openAnomaliesModal(): void {
    this.isAnomaliesModalVisible = true;
  }

  closeAnomaliesModal(): void {
    this.isAnomaliesModalVisible = false;
  }

  resolveAnomaly(anomalyId: number): void {
    if (!this.selectedBabyId || this.resolvingAnomalyId !== null) {
      return;
    }

    const babyId = this.selectedBabyId;
    this.resolvingAnomalyId = anomalyId;
    this.command.resolveBabyForecastAnomaly(babyId, anomalyId).subscribe({
      next: () => {
        this.resolvingAnomalyId = null;
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.baby.forecast.anomalies.resolveSuccess')
        );
        this.forecastAnomalies = this.forecastAnomalies.filter((a) => a.id !== anomalyId);
        this.loadForecast();
      },
      error: (err) => {
        this.resolvingAnomalyId = null;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.forecast.anomalies.resolveFailed')
        );
      }
    });
  }

  private loadBabyCareOverview(): void {
    if (!this.selectedBabyId) {
      this.dashboard = null;
      this.selectedDateLogs = [];
      return;
    }

    const babyId = this.selectedBabyId;
    const dateKey = this.currentDateKey();
    const requestKey = `${babyId}:${dateKey}`;
    this.overviewRequestKey = requestKey;

    this.dashboardLoadError = null;
    this.logsLoadError = null;
    this.isLoadingDashboard = true;
    this.isLoadingSelectedDateLogs = true;

    this.command
      .getBabyDashboard({
        babyId,
        date: dateKey,
        trendDays: 7,
        recentLogLimit: 12,
        upcomingVaccineLimit: 6
      })
      .subscribe({
        next: (dashboard) => {
          if (this.overviewRequestKey !== requestKey) {
            return;
          }
          this.isLoadingDashboard = false;
          this.dashboard = dashboard;
        },
        error: (err) => {
          if (this.overviewRequestKey !== requestKey) {
            return;
          }
          this.isLoadingDashboard = false;
          this.dashboard = null;
          this.dashboardLoadError = err?.message || this.i18n.translate('momApp.baby.messages.summaryLoadFailed');
        }
      });

    this.command.getBabyLogs(babyId, dateKey).subscribe({
      next: (logs) => {
        if (this.overviewRequestKey !== requestKey) {
          return;
        }
        this.isLoadingSelectedDateLogs = false;
        this.selectedDateLogs = [...logs].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
      },
      error: (err) => {
        if (this.overviewRequestKey !== requestKey) {
          return;
        }
        this.isLoadingSelectedDateLogs = false;
        this.selectedDateLogs = [];
        this.logsLoadError = err?.message || this.i18n.translate('momApp.baby.messages.logLoadFailed');
      }
    });
  }

  private loadForecast(): void {
    if (!this.selectedBabyId) {
      this.forecast = null;
      this.forecastAnomalies = [];
      return;
    }

    const babyId = this.selectedBabyId;
    this.isLoadingForecast = true;
    this.forecastLoadError = null;

    forkJoin({
      latest: this.command.getBabyForecastLatest(babyId),
      anomalies: this.command.getBabyForecastAnomalies(babyId, true)
    }).subscribe({
      next: ({ latest, anomalies }) => {
        if (this.selectedBabyId !== babyId) {
          return;
        }
        this.isLoadingForecast = false;
        this.forecast = latest;
        this.forecastAnomalies = anomalies;
      },
      error: (err) => {
        if (this.selectedBabyId !== babyId) {
          return;
        }
        this.isLoadingForecast = false;
        this.forecast = null;
        this.forecastAnomalies = [];
        this.forecastLoadError = err?.message || this.i18n.translate('momApp.baby.forecast.messages.loadFailed');
      }
    });
  }

  private loadMedicalData(): void {
    if (!this.selectedBabyId) {
      this.growthRecords = [];
      this.vaccinations = [];
      return;
    }

    const babyId = this.selectedBabyId;
    this.isLoadingGrowthRecords = true;
    this.isLoadingVaccinations = true;
    this.growthLoadError = null;
    this.vaccinationLoadError = null;

    if (this.growthPremiumLocked) {
      this.isLoadingGrowthRecords = false;
      this.growthRecords = [];
      this.growthLoadError = this.growthPremiumLockMessage();
      this.command.getVaccinations(babyId).pipe(
        catchError((err) => {
          this.vaccinationLoadError = err?.message || this.i18n.translate('momApp.baby.messages.vaccinationLoadFailed');
          return of([] as BabyVaccination[]);
        })
      ).subscribe((vaccinations) => {
        this.isLoadingVaccinations = false;
        this.vaccinations = vaccinations;
      });
      return;
    }

    forkJoin({
      growthRecords: this.command.getGrowthRecords(babyId).pipe(
        catchError((err) => {
          if (this.isPremiumRequired(err, this.advancedGrowthFeatureKey)) {
            this.growthPremiumLocked = true;
            this.growthLoadError = this.growthPremiumLockMessage();
          } else {
            this.growthLoadError = err?.message || this.i18n.translate('momApp.baby.messages.growthLoadFailed');
          }
          return of([] as BabyGrowthRecord[]);
        })
      ),
      vaccinations: this.command.getVaccinations(babyId).pipe(
        catchError((err) => {
          this.vaccinationLoadError = err?.message || this.i18n.translate('momApp.baby.messages.vaccinationLoadFailed');
          return of([] as BabyVaccination[]);
        })
      )
    }).subscribe(({ growthRecords, vaccinations }) => {
      this.isLoadingGrowthRecords = false;
      this.isLoadingVaccinations = false;
      this.growthRecords = growthRecords;
      this.vaccinations = vaccinations;
    });
  }

  private loadPremiumFeatures(): void {
    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      this.growthPremiumLocked = !this.hasFeatureEnabled(features, this.advancedGrowthFeatureKey);
      if (this.growthPremiumLocked) {
        this.growthLoadError = this.growthPremiumLockMessage();
      } else if (this.growthLoadError === this.growthPremiumLockMessage()) {
        this.growthLoadError = null;
      }
    });
  }

  private loadGalleryFiles(): void {
    if (!this.selectedBabyId) {
      this.galleryFiles = [];
      this.selectedBabyAvatarUrl = null;
      return;
    }

    this.isLoadingGallery = true;
    this.galleryLoadError = null;
    this.command
      .getFiles(this.babyGalleryBucket, `baby:${this.selectedBabyId}`)
      .pipe(
        map((files) =>
          [...files].sort((left, right) => {
            const leftTime = Date.parse(left.createdAt ?? '');
            const rightTime = Date.parse(right.createdAt ?? '');
            if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
              return right.id - left.id;
            }
            return rightTime - leftTime;
          })
        ),
        switchMap((files) => {
          if (files.length === 0) {
            return of([] as GalleryFileView[]);
          }

          return forkJoin(
            files.map((file) =>
              this.command.getFileDownloadUrl(file.id).pipe(
                map((url) => ({ ...file, previewUrl: url })),
                catchError(() => of({ ...file, previewUrl: null }))
              )
            )
          );
        })
      )
      .subscribe({
        next: (files) => {
          this.isLoadingGallery = false;
          this.galleryFiles = files;
          this.selectedBabyAvatarUrl = files.find((file) => !!file.previewUrl)?.previewUrl ?? null;
        },
        error: (err) => {
          this.isLoadingGallery = false;
          this.galleryFiles = [];
          this.selectedBabyAvatarUrl = null;
          this.galleryLoadError = err?.message || this.i18n.translate('momApp.baby.gallery.messages.loadFailed');
        }
      });
  }

  loadFamilyMembersAndUser(): void {
    this.command.getFamilyMembersDetailed().subscribe({
      next: (members) => {
        this.familyMembers = members;
      }
    });

    this.command.getProfile().subscribe({
      next: (profile) => {
        this.currentUserId = profile.userId;
      }
    });
  }

  toggleComments(log: BabyLogEntry): void {
    const isExpanded = !!this.expandedComments[log.id];
    this.expandedComments[log.id] = !isExpanded;
    if (!isExpanded) {
      this.loadComments(log.id);
    }
  }

  loadComments(logId: number): void {
    this.commentsLoading[logId] = true;
    this.command.getBabyLogComments(logId).subscribe({
      next: (comments) => {
        this.commentsLoading[logId] = false;
        this.commentsByLogId[logId] = comments;
      },
      error: () => {
        this.commentsLoading[logId] = false;
        this.commentsByLogId[logId] = [];
      }
    });
  }

  submitComment(logId: number): void {
    const content = (this.commentInputs[logId] ?? '').trim();
    if (!content) {
      return;
    }

    this.isSubmittingComment[logId] = true;
    this.command.createBabyLogComment(logId, content).subscribe({
      next: (newComment) => {
        this.isSubmittingComment[logId] = false;
        this.commentInputs[logId] = '';
        
        // Cập nhật optimistic UI
        const list = this.commentsByLogId[logId] ?? [];
        this.commentsByLogId[logId] = [...list, newComment];
        
        // Tải lại để đảm bảo dữ liệu mới nhất
        this.loadComments(logId);
        
        // Cập nhật dashboard
        this.loadBabyCareOverview();
      },
      error: (err) => {
        this.isSubmittingComment[logId] = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.comments.messages.createFailed')
        );
      }
    });
  }

  deleteComment(logId: number, commentId: number): void {
    this.command.deleteBabyLogComment(commentId).subscribe({
      next: () => {
        this.commentsByLogId[logId] = (this.commentsByLogId[logId] ?? []).filter(c => c.id !== commentId);
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.baby.comments.messages.deleteSuccess')
        );
        this.loadBabyCareOverview();
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.comments.messages.deleteFailed')
        );
      }
    });
  }

  getCommenterName(userId: number): string {
    const member = this.familyMembers.find(m => m.userId === userId);
    return member?.displayName || `#User_${userId}`;
  }

  getCommenterAvatar(userId: number): string | null {
    const member = this.familyMembers.find(m => m.userId === userId);
    return member?.avatarUrl || null;
  }

  getCommenterRole(userId: number): string {
    const member = this.familyMembers.find(m => m.userId === userId);
    if (!member) return '';
    return this.i18n.translate(`momApp.family.role.${member.role}`);
  }

  canDeleteComment(commentUserId: number): boolean {
    return commentUserId === this.currentUserId;
  }

  private resetSelectedBabyState(): void {
    this.selectedBabyControl.setValue(null, { emitEvent: false });
    this.selectedBabyId = null;
    this.dashboard = null;
    this.selectedDateLogs = [];
    this.growthRecords = [];
    this.vaccinations = [];
    this.galleryFiles = [];
    this.forecast = null;
    this.forecastAnomalies = [];
    this.selectedBabyAvatarUrl = null;
    this.growthPremiumLocked = false;
  }

  private hasFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string): boolean {
    const matched = features.find((item) => item.featureKey === featureKey);
    return matched ? matched.enabled : true;
  }

  private isPremiumRequired(err: any, featureKey: string): boolean {
    const message = String(err?.message ?? '');
    return message.includes(`PREMIUM_REQUIRED:${featureKey}`);
  }

  private growthPremiumLockMessage(): string {
    return this.i18n.translate('momApp.baby.messages.premiumGrowthRequired');
  }

  private notifySelectBabyFirst(): void {
    this.notification.warning(
      this.i18n.translate('common.errorTitle'),
      this.i18n.translate('momApp.baby.gallery.messages.selectBabyFirst')
    );
  }

  private defaultQuickLogValue(logType: BabyLogType): number {
    if (logType === 'SLEEP') {
      return 1;
    }
    return 1;
  }

  private parseJsonStringArray(value: string | null | undefined): string[] {
    if (!value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private numberOrNull(value: unknown): number | null {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return numeric;
  }

  private defaultLoggedAtDate(): Date {
    const selected = this.selectedDateControl.value;
    if (!selected) {
      return new Date();
    }

    const now = new Date();
    const merged = new Date(selected);
    merged.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    return merged;
  }

  private buildLogTimestampForSelectedDate(): string {
    return this.defaultLoggedAtDate().toISOString();
  }

  private currentDateKey(): string {
    return this.formatLocalDate(this.selectedDateControl.value ?? new Date());
  }

  private resolveDateValue(date: Date | string | null): Date | null {
    if (!date) {
      return null;
    }

    if (date instanceof Date) {
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatLocalDate(date: Date): string {
    const parsed = this.resolveDateValue(date);
    if (!parsed) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}


