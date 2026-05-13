import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, switchMap } from 'rxjs';
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
import {
  BabyGender,
  BabyLogType,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { I18nService } from '../i18n/i18n.service';

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
    NzSelectModule
  ],
  templateUrl: './baby.component.html',
  styleUrl: './baby.component.css'
})
export class BabyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly snapshot$ = this.refresh$.pipe(switchMap(() => this.data.getDashboard()));

  readonly logTypes: BabyLogType[] = ['SLEEP', 'FEEDING', 'DIAPER'];
  readonly genders: BabyGender[] = ['MALE', 'FEMALE', 'OTHER'];

  isCreateBabyModalVisible = false;
  isCreateLogModalVisible = false;
  isSubmittingBaby = false;
  isSubmittingLog = false;

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

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
