import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, combineLatest, finalize, map, of, startWith, switchMap, tap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { ShoppingItem } from '../core/models/super-app.model';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

type ShoppingFilter = 'ALL' | 'PENDING' | 'BOUGHT';
type ShoppingSort = 'SMART' | 'NAME_ASC' | 'NAME_DESC';

interface ShoppingViewModel {
  items: ShoppingItem[];
  filteredItems: ShoppingItem[];
  pendingItems: ShoppingItem[];
  boughtItems: ShoppingItem[];
  checkedCount: number;
  remainingCount: number;
  completionPercent: number;
}

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
    NzInputModule,
    NzEmptyModule
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
  private readonly filter$ = new BehaviorSubject<ShoppingFilter>('ALL');
  private readonly sort$ = new BehaviorSubject<ShoppingSort>('SMART');

  readonly searchControl = this.fb.nonNullable.control('', [Validators.maxLength(120)]);

  isCreateModalVisible = false;
  isSubmitting = false;
  isQuickAdding = false;
  isLoading = false;
  loadFailed = false;
  activeFilter: ShoppingFilter = 'ALL';
  activeSort: ShoppingSort = 'SMART';

  readonly createItemForm = this.fb.nonNullable.group({
    itemName: ['', [Validators.required, Validators.maxLength(180)]],
    quantity: ['', [Validators.maxLength(80)]],
    note: ['', [Validators.maxLength(500)]]
  });

  readonly quickAddForm = this.fb.nonNullable.group({
    itemName: ['', [Validators.required, Validators.maxLength(180)]],
    quantity: ['', [Validators.maxLength(80)]],
    note: ['', [Validators.maxLength(300)]]
  });

  readonly filterOptions: ReadonlyArray<{ value: ShoppingFilter; labelKey: string }> = [
    { value: 'ALL', labelKey: 'momApp.shopping.filters.all' },
    { value: 'PENDING', labelKey: 'momApp.shopping.filters.pending' },
    { value: 'BOUGHT', labelKey: 'momApp.shopping.filters.bought' }
  ];

  readonly sortOptions: ReadonlyArray<{ value: ShoppingSort; labelKey: string }> = [
    { value: 'SMART', labelKey: 'momApp.shopping.sort.smart' },
    { value: 'NAME_ASC', labelKey: 'momApp.shopping.sort.nameAsc' },
    { value: 'NAME_DESC', labelKey: 'momApp.shopping.sort.nameDesc' }
  ];

  readonly items$ = this.refresh$.pipe(
    tap(() => {
      this.isLoading = true;
      this.loadFailed = false;
    }),
    switchMap(() =>
      this.data.getShoppingItems().pipe(
        catchError(() => {
          this.loadFailed = true;
          return of([] as ShoppingItem[]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
    )
  );

  readonly viewModel$ = combineLatest([
    this.items$,
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value)),
    this.filter$,
    this.sort$
  ]).pipe(
    map(([items, searchText, filter, sort]) => this.buildViewModel(items, searchText, filter, sort))
  );

  openCreateModal(): void {
    this.isCreateModalVisible = true;
  }

  closeCreateModal(): void {
    this.isCreateModalVisible = false;
    this.createItemForm.reset();
  }

  submitCreateItem(): void {
    if (this.createItemForm.invalid) {
      this.createItemForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.command
      .createShoppingItem({
        itemName: this.createItemForm.controls.itemName.value.trim(),
        quantity: this.createItemForm.controls.quantity.value.trim(),
        note: this.createItemForm.controls.note.value.trim()
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
            this.resolveErrorMessage(err, 'momApp.shopping.messages.createFailed')
          );
        }
      });
  }

  submitQuickAdd(): void {
    if (this.quickAddForm.invalid) {
      this.quickAddForm.markAllAsTouched();
      return;
    }

    this.isQuickAdding = true;
    this.command
      .createShoppingItem({
        itemName: this.quickAddForm.controls.itemName.value.trim(),
        quantity: this.quickAddForm.controls.quantity.value.trim(),
        note: this.quickAddForm.controls.note.value.trim()
      })
      .subscribe({
        next: () => {
          this.isQuickAdding = false;
          this.quickAddForm.reset();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.shopping.messages.quickAddSuccess')
          );
        },
        error: (err) => {
          this.isQuickAdding = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            this.resolveErrorMessage(err, 'momApp.shopping.messages.createFailed')
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
          this.resolveErrorMessage(err, 'momApp.shopping.messages.updateFailed')
        );
      }
    });
  }

  setFilter(filter: ShoppingFilter): void {
    this.activeFilter = filter;
    this.filter$.next(filter);
  }

  onSortChange(rawValue: string): void {
    const nextSort = this.parseSort(rawValue);
    this.activeSort = nextSort;
    this.sort$.next(nextSort);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  trackByItemId(_: number, item: ShoppingItem): string {
    return item.id;
  }

  private buildViewModel(
    items: ReadonlyArray<ShoppingItem>,
    rawSearchText: string,
    filter: ShoppingFilter,
    sort: ShoppingSort
  ): ShoppingViewModel {
    const searchText = this.normalizeText(rawSearchText);
    const filtered = items
      .filter((item) => this.matchFilter(item, filter))
      .filter((item) => this.matchSearch(item, searchText));

    const sorted = this.sortItems(filtered, sort);
    const pendingItems = sorted.filter((item) => !item.checked);
    const boughtItems = sorted.filter((item) => item.checked);
    const checkedCount = items.filter((item) => item.checked).length;
    const remainingCount = items.length - checkedCount;
    const completionPercent = items.length === 0 ? 0 : Math.round((checkedCount / items.length) * 100);

    return {
      items: [...items],
      filteredItems: sorted,
      pendingItems,
      boughtItems,
      checkedCount,
      remainingCount,
      completionPercent
    };
  }

  private matchFilter(item: ShoppingItem, filter: ShoppingFilter): boolean {
    if (filter === 'PENDING') {
      return !item.checked;
    }
    if (filter === 'BOUGHT') {
      return item.checked;
    }
    return true;
  }

  private matchSearch(item: ShoppingItem, searchText: string): boolean {
    if (!searchText) {
      return true;
    }

    const haystack = this.normalizeText(`${item.name} ${item.quantity} ${item.note}`);
    return haystack.includes(searchText);
  }

  private sortItems(items: ReadonlyArray<ShoppingItem>, sort: ShoppingSort): ShoppingItem[] {
    const sorted = [...items];

    if (sort === 'NAME_ASC') {
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      return sorted;
    }

    if (sort === 'NAME_DESC') {
      sorted.sort((left, right) => right.name.localeCompare(left.name));
      return sorted;
    }

    sorted.sort((left, right) => {
      if (left.checked !== right.checked) {
        return Number(left.checked) - Number(right.checked);
      }
      return this.resolveItemOrder(right) - this.resolveItemOrder(left);
    });

    return sorted;
  }

  private resolveItemOrder(item: ShoppingItem): number {
    const numericId = Number(item.id);
    return Number.isFinite(numericId) ? numericId : 0;
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  private parseSort(value: string): ShoppingSort {
    if (value === 'NAME_ASC' || value === 'NAME_DESC' || value === 'SMART') {
      return value;
    }
    return 'SMART';
  }

  private resolveErrorMessage(error: unknown, fallbackKey: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const nested = (error as { error?: { message?: unknown } }).error;
      if (nested && typeof nested.message === 'string' && nested.message.trim()) {
        return nested.message;
      }
    }
    return this.i18n.translate(fallbackKey);
  }
}
