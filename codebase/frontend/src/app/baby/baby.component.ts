import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import {
  BabyGender,
  BabyLogType,
  FileMetadata,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { I18nService } from '../i18n/i18n.service';

interface BabyProfile {
  id: number;
  name: string;
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
    NzEmptyModule
  ],
  templateUrl: './baby.component.html',
  styleUrl: './baby.component.css'
})
export class BabyComponent {
  private readonly babyGalleryBucket = 'baby-gallery';
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly snapshot$ = this.refresh$.pipe(switchMap(() => this.data.getDashboard()));
  readonly babyProfiles$ = this.refresh$.pipe(
    switchMap(() => {
      this.galleryLoadError = null;
      return this.command.getBabies().pipe(
        map((babies) =>
          babies.map((item) => ({
            id: item.id,
            name: item.name
          }))
        ),
        tap((babies) => {
          if (babies.length === 0) {
            this.galleryBabyControl.setValue(null, { emitEvent: false });
            this.selectedGalleryBabyId = null;
            this.galleryFiles = [];
            return;
          }

          const currentSelectedId = this.galleryBabyControl.value;
          const hasSelectedBaby = currentSelectedId
            ? babies.some((baby) => baby.id === currentSelectedId)
            : false;
          if (!hasSelectedBaby) {
            this.galleryBabyControl.setValue(babies[0].id);
          }
        }),
        catchError((err) => {
          this.galleryLoadError = err?.error?.message || this.i18n.translate('momApp.baby.gallery.messages.loadFailed');
          this.galleryBabyControl.setValue(null, { emitEvent: false });
          this.selectedGalleryBabyId = null;
          this.galleryFiles = [];
          return of([] as BabyProfile[]);
        })
      );
    })
  );

  readonly logTypes: BabyLogType[] = ['SLEEP', 'FEEDING', 'DIAPER'];
  readonly genders: BabyGender[] = ['MALE', 'FEMALE', 'OTHER'];

  isCreateBabyModalVisible = false;
  isCreateLogModalVisible = false;
  isSubmittingBaby = false;
  isSubmittingLog = false;
  isUploadingGallery = false;
  isLoadingGallery = false;
  galleryLoadError: string | null = null;
  selectedGalleryBabyId: number | null = null;
  galleryFiles: FileMetadata[] = [];
  readonly galleryBabyControl = this.fb.control<number | null>(null);

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
    this.galleryBabyControl.valueChanges.subscribe((babyId) => {
      if (!babyId) {
        this.selectedGalleryBabyId = null;
        this.galleryFiles = [];
        return;
      }
      this.onSelectGalleryBaby(babyId);
    });
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
            err?.error?.message || this.i18n.translate('momApp.baby.messages.createBabyFailed')
          );
        }
      });
  }

  submitCreateLog(): void {
    if (this.createLogForm.invalid) {
      this.createLogForm.markAllAsTouched();
      return;
    }

    const valueRaw = Number(this.createLogForm.controls.value.value ?? 0);
    this.isSubmittingLog = true;
    this.command
      .createBabyLog({
        logType: this.createLogForm.controls.logType.value ?? 'SLEEP',
        value: Number.isFinite(valueRaw) ? valueRaw : 0,
        note: this.createLogForm.controls.note.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmittingLog = false;
          this.closeCreateLogModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.baby.messages.createLogSuccess')
          );
        },
        error: (err) => {
          this.isSubmittingLog = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.baby.messages.createLogFailed')
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

  onSelectGalleryBaby(babyId: number): void {
    this.galleryLoadError = null;
    this.selectedGalleryBabyId = babyId;
    this.loadGalleryFiles();
  }

  onGalleryFileSelected(event: Event): void {
    if (!this.selectedGalleryBabyId) {
      this.notification.warning(
        this.i18n.translate('common.errorTitle'),
        this.i18n.translate('momApp.baby.gallery.messages.selectBabyFirst')
      );
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.isUploadingGallery = true;
    this.command.uploadFile(file, this.babyGalleryBucket, `baby:${this.selectedGalleryBabyId}`).subscribe({
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
          err?.error?.message || this.i18n.translate('momApp.baby.gallery.messages.uploadFailed')
        );
      }
    });
  }

  downloadGalleryFile(file: FileMetadata): void {
    this.command.getFileDownloadUrl(file.id).subscribe({
      next: (url) => {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener');
        }
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.baby.gallery.messages.downloadFailed')
        );
      }
    });
  }

  deleteGalleryFile(file: FileMetadata): void {
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
          err?.error?.message || this.i18n.translate('momApp.baby.gallery.messages.deleteFailed')
        );
      }
    });
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

  private loadGalleryFiles(): void {
    if (!this.selectedGalleryBabyId) {
      this.galleryFiles = [];
      return;
    }

    this.isLoadingGallery = true;
    this.command.getFiles(this.babyGalleryBucket, `baby:${this.selectedGalleryBabyId}`).subscribe({
      next: (files) => {
        this.isLoadingGallery = false;
        this.galleryFiles = files;
      },
      error: () => {
        this.isLoadingGallery = false;
        this.galleryFiles = [];
      }
    });
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
