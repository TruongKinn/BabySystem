import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { MealType, SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-meals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    NzEmptyModule
  ],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.css'
})
export class MealsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly meals$ = this.refresh$.pipe(switchMap(() => this.data.getWeekMeals()));

  readonly mealTypes: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

  isCreateModalVisible = false;
  isSubmitting = false;

  readonly createMealPlanForm = this.fb.group({
    mealName: ['', [Validators.required, Validators.maxLength(160)]],
    mealType: ['DINNER' as MealType, [Validators.required]],
    planDate: [null as Date | null, [Validators.required]],
    notes: ['', [Validators.maxLength(500)]]
  });

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
    this.createMealPlanForm.reset({
      mealName: '',
      mealType: 'DINNER',
      planDate: null,
      notes: ''
    });
  }

  submitCreateMealPlan(): void {
    if (this.createMealPlanForm.invalid) {
      this.createMealPlanForm.markAllAsTouched();
      return;
    }

    const planDate = this.createMealPlanForm.controls.planDate.value;
    if (!planDate) {
      return;
    }

    this.isSubmitting = true;
    this.command
      .createMealPlan({
        mealName: this.createMealPlanForm.controls.mealName.value?.trim() ?? '',
        mealType: this.createMealPlanForm.controls.mealType.value ?? 'DINNER',
        planDate: this.formatLocalDate(planDate),
        notes: this.createMealPlanForm.controls.notes.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeCreateModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.meals.messages.createSuccess')
          );
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.meals.messages.createFailed')
          );
        }
      });
  }

  mealTypeLabel(type: MealType): string {
    return this.i18n.translate(`momApp.meals.mealType.${type}`);
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
