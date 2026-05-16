import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { FileMetadata, SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

interface ExpenseRecord {
  id: number;
  categoryName: string;
  amount: number;
  currency: string;
  note: string | null;
  spentAt: string;
}

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
  private readonly expenseReceiptBucket = 'expense-receipts';
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

  readonly expenseRecords$ = this.refresh$.pipe(
    switchMap(() =>
      this.command.getExpenses().pipe(
        map((items) =>
          items.map((item) => ({
            id: item.id,
            categoryName: item.categoryName,
            amount: item.amount,
            currency: item.currency,
            note: item.note,
            spentAt: item.spentAt
          }))
        ),
        catchError(() => of([] as ExpenseRecord[]))
      )
    )
  );

  isCreateModalVisible = false;
  isSubmitting = false;
  isReceiptModalVisible = false;
  isLoadingReceipts = false;
  isUploadingReceipt = false;
  selectedExpense: ExpenseRecord | null = null;
  receiptFiles: FileMetadata[] = [];

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

  openReceiptModal(expense: ExpenseRecord): void {
    this.selectedExpense = expense;
    this.isReceiptModalVisible = true;
    this.loadReceiptFiles();
  }

  closeReceiptModal(): void {
    this.isReceiptModalVisible = false;
    this.selectedExpense = null;
    this.receiptFiles = [];
  }

  onReceiptFileSelected(event: Event): void {
    if (!this.selectedExpense) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.isUploadingReceipt = true;
    this.command.uploadFile(file, this.expenseReceiptBucket, `expense:${this.selectedExpense.id}`).subscribe({
      next: () => {
        this.isUploadingReceipt = false;
        this.loadReceiptFiles();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.expenses.messages.uploadReceiptSuccess')
        );
      },
      error: (err) => {
        this.isUploadingReceipt = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.expenses.messages.uploadReceiptFailed')
        );
      }
    });
  }

  downloadReceipt(file: FileMetadata): void {
    this.command.getFileDownloadUrl(file.id).subscribe({
      next: (url) => {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener');
        }
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.expenses.messages.downloadReceiptFailed')
        );
      }
    });
  }

  deleteReceipt(file: FileMetadata): void {
    this.command.deleteFile(file.id).subscribe({
      next: () => {
        this.loadReceiptFiles();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.expenses.messages.deleteReceiptSuccess')
        );
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.expenses.messages.deleteReceiptFailed')
        );
      }
    });
  }

  formatSpentAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadReceiptFiles(): void {
    if (!this.selectedExpense) {
      return;
    }
    this.isLoadingReceipts = true;
    this.command.getFiles(this.expenseReceiptBucket, `expense:${this.selectedExpense.id}`).subscribe({
      next: (files) => {
        this.isLoadingReceipts = false;
        this.receiptFiles = files;
      },
      error: () => {
        this.isLoadingReceipts = false;
        this.receiptFiles = [];
      }
    });
  }
}
