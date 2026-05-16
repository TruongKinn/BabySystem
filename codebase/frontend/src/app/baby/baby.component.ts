import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import {
  BabyDailySummary,
  BabyGender,
  BabyLogEntry,
  BabyLogType,
  BabyProfile,
  FileMetadata,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

interface GalleryFileView extends FileMetadata {
  previewUrl: string | null;
}

@Component({
  selector: 'app-baby',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzDescriptionsModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule,
    NzSelectModule,
    NzSpinModule,
    NzEmptyModule,
    NzImageModule
  ],
  templateUrl: './baby.component.html',
  styleUrl: './baby.component.css'
})
export class BabyComponent {
  private readonly babyGalleryBucket = 'baby-gallery';
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private babyProfilesCache: BabyProfile[] = [];

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
  isSubmittingBaby = false;
  isSubmittingLog = false;
  isUploadingGallery = false;
  isLoadingGallery = false;
  isLoadingSummary = false;
  isLoadingLogs = false;
  quickLogLoadingType: BabyLogType | null = null;

  galleryLoadError: string | null = null;
  summaryLoadError: string | null = null;
  logsLoadError: string | null = null;

  selectedBabyId: number | null = null;
  summary: BabyDailySummary | null = null;
  todayLogs: BabyLogEntry[] = [];
  galleryFiles: GalleryFileView[] = [];

  readonly selectedBabyControl = this.fb.control<number | null>(null);

  readonly createBabyForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    birthDate: [null as Date | null, [Validators.required]],
    gender: ['FEMALE' as BabyGender, [Validators.required]],
    notes: ['', [Validators.maxLength(600)]]
  });

  readonly createLogForm = this.fb.group({
    logType: ['SLEEP' as BabyLogType, [Validators.required]],
    value: [0],
    note: ['', [Validators.maxLength(500)]]
  });

  constructor() {
    this.selectedBabyControl.valueChanges.subscribe((babyId) => {
      if (!babyId) {
        this.resetSelectedBabyState();
        return;
      }

      if (babyId === this.selectedBabyId) {
        return;
      }

      this.selectBaby(babyId);
    });
  }

  get selectedBaby(): BabyProfile | null {
    if (!this.selectedBabyId) {
      return null;
    }
    return this.babyProfilesCache.find((item) => item.id === this.selectedBabyId) ?? null;
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
    this.isCreateLogModalVisible = true;
  }

  closeCreateLogModal(): void {
    this.isCreateLogModalVisible = false;
    this.createLogForm.reset({
      logType: 'SLEEP',
      value: 0,
      note: ''
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
    this.isSubmittingLog = true;
    this.command
      .createBabyLog({
        babyId: this.selectedBabyId,
        logType: this.createLogForm.controls.logType.value ?? 'SLEEP',
        value: Number.isFinite(valueRaw) ? valueRaw : 0,
        note: this.createLogForm.controls.note.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmittingLog = false;
          this.closeCreateLogModal();
          this.loadSelectedBabyOverview();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.createLogSuccess')
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
        note: ''
      })
      .subscribe({
        next: () => {
          this.quickLogLoadingType = null;
          this.loadSelectedBabyOverview();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.createLogSuccess')
          );
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
      return 'heart';
    }
    return 'alert';
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

  formatDateTime(value: string | null): string {
    if (!value?.trim()) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const lang = this.i18n.getCurrentLanguage();
    const locale = lang === 'vi' ? 'vi-VN' : 'en-US';
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
          err?.message || this.i18n.translate('momApp.baby.gallery.messages.uploadFailed')
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
    this.loadSelectedBabyOverview();
    this.loadGalleryFiles();
  }

  private loadSelectedBabyOverview(): void {
    if (!this.selectedBabyId) {
      this.summary = null;
      this.todayLogs = [];
      return;
    }

    const babyId = this.selectedBabyId;
    const dateKey = this.currentDateKey();

    this.summaryLoadError = null;
    this.logsLoadError = null;
    this.isLoadingSummary = true;
    this.isLoadingLogs = true;

    this.command.getBabySummary(babyId, dateKey).subscribe({
      next: (summary) => {
        this.isLoadingSummary = false;
        this.summary = summary;
      },
      error: (err) => {
        this.isLoadingSummary = false;
        this.summary = null;
        this.summaryLoadError = err?.message || this.i18n.translate('momApp.baby.messages.summaryLoadFailed');
      }
    });

    this.command.getBabyLogs(babyId, dateKey).subscribe({
      next: (logs) => {
        this.isLoadingLogs = false;
        this.todayLogs = [...logs].sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));
      },
      error: (err) => {
        this.isLoadingLogs = false;
        this.todayLogs = [];
        this.logsLoadError = err?.message || this.i18n.translate('momApp.baby.messages.logLoadFailed');
      }
    });
  }

  private loadGalleryFiles(): void {
    if (!this.selectedBabyId) {
      this.galleryFiles = [];
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
        },
        error: (err) => {
          this.isLoadingGallery = false;
          this.galleryFiles = [];
          this.galleryLoadError = err?.message || this.i18n.translate('momApp.baby.gallery.messages.loadFailed');
        }
      });
  }

  private resetSelectedBabyState(): void {
    this.selectedBabyControl.setValue(null, { emitEvent: false });
    this.selectedBabyId = null;
    this.summary = null;
    this.todayLogs = [];
    this.galleryFiles = [];
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

  private currentDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
