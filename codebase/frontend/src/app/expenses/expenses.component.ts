import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, map, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzProgressModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly expense$ = this.refresh$.pipe(
    switchMap(() => this.data.getDashboard()),
    map((snapshot) => ({
      ...snapshot.expense,
      budgetPercent:
        snapshot.expense.monthlyBudget > 0
          ? Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)
          : 0
    }))
  );

  isCreateModalVisible = false;
  isSubmitting = false;

  readonly createExpenseForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    categoryName: ['', [Validators.required, Validators.maxLength(100)]],
    note: ['', [Validators.maxLength(500)]]
  });

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
    this.createExpenseForm.reset({
      amount: null,
      categoryName: '',
      note: ''
    });
  }

  submitCreateExpense(): void {
    if (this.createExpenseForm.invalid) {
      this.createExpenseForm.markAllAsTouched();
      return;
    }

    const amount = Number(this.createExpenseForm.controls.amount.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.isSubmitting = true;
    this.command
      .createExpense({
        amount,
        categoryName: this.createExpenseForm.controls.categoryName.value?.trim() ?? '',
        note: this.createExpenseForm.controls.note.value?.trim() ?? '',
        currency: 'VND'
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeCreateModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.expenses.messages.createSuccess')
          );
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.expenses.messages.createFailed')
          );
        }
      });
  }
}
