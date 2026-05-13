import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule
  ],
  templateUrl: './shopping.component.html',
  styleUrl: './shopping.component.css'
})
export class ShoppingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly items$ = this.refresh$.pipe(switchMap(() => this.data.getShoppingItems()));

  isCreateModalVisible = false;
  isSubmitting = false;

  readonly createItemForm = this.fb.group({
    itemName: ['', [Validators.required, Validators.maxLength(180)]],
    quantity: ['', [Validators.maxLength(80)]],
    note: ['', [Validators.maxLength(500)]]
  });

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
    this.createItemForm.reset({
      itemName: '',
      quantity: '',
      note: ''
    });
  }

  submitCreateItem(): void {
    if (this.createItemForm.invalid) {
      this.createItemForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.command
      .createShoppingItem({
        itemName: this.createItemForm.controls.itemName.value?.trim() ?? '',
        quantity: this.createItemForm.controls.quantity.value?.trim() ?? '',
        note: this.createItemForm.controls.note.value?.trim() ?? ''
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeCreateModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.shopping.messages.createSuccess')
          );
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.shopping.messages.createFailed')
          );
        }
      });
  }

  toggleChecked(itemId: string, checked: boolean): void {
    const parsedId = Number(itemId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return;
    }

    this.command.updateShoppingItemChecked(parsedId, !checked).subscribe({
      next: () => {
        this.refresh$.next();
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.shopping.messages.updateFailed')
        );
      }
    });
  }
}
