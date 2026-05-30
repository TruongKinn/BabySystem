import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, finalize, map, of, startWith, switchMap, tap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
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
  totalItems: number;
  allTotalCount: number;
  currentPage: number;
  pageSize: number;
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
    NzEmptyModule,
    NzPaginationModule
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
  readonly page$ = new BehaviorSubject<{ index: number; size: number }>({ index: 1, size: 10 });

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

  // Debounced search term
  readonly searchDebounced$ = this.searchControl.valueChanges.pipe(
    startWith(this.searchControl.value),
    debounceTime(300),
    distinctUntilChanged()
  );

  // Thống kê số lượng chưa mua (pendingCount)
  readonly pendingCount$ = this.refresh$.pipe(
    switchMap(() => this.data.getShoppingPendingCount(this.data.getFamilyId()).pipe(
      map(res => res.pendingCount),
      catchError(() => of(0))
    ))
  );

  // Thống kê tổng số lượng (totalCount)
  readonly totalCount$ = this.refresh$.pipe(
    switchMap(() => this.data.getShoppingItemsPage(0, 1, null, '').pipe(
      map(res => res.total),
      catchError(() => of(0))
    ))
  );

  readonly stats$ = combineLatest([this.totalCount$, this.pendingCount$]).pipe(
    map(([total, pending]) => ({
      totalCount: total,
      pendingCount: pending,
      checkedCount: Math.max(0, total - pending),
      completionPercent: total === 0 ? 0 : Math.round((Math.max(0, total - pending) / total) * 100)
    })),
    startWith({ totalCount: 0, pendingCount: 0, checkedCount: 0, completionPercent: 0 })
  );

  // Khi filter hoặc search thay đổi, reset trang về 1
  readonly filterOrSearch$ = combineLatest([this.filter$, this.searchDebounced$]).pipe(
    tap(() => {
      const current = this.page$.value;
      if (current.index !== 1) {
        this.page$.next({ index: 1, size: current.size });
      }
    })
  );

  readonly itemsPage$ = combineLatest([
    this.refresh$,
    this.filterOrSearch$,
    this.page$
  ]).pipe(
    tap(() => {
      this.isLoading = true;
      this.loadFailed = false;
    }),
    switchMap(([, [filter, searchText], page]) => {
      const checkedParam = filter === 'ALL' ? null : filter === 'BOUGHT';
      return this.data.getShoppingItemsPage(page.index - 1, page.size, checkedParam, searchText).pipe(
        catchError(() => {
          this.loadFailed = true;
          return of({ page: page.index - 1, size: page.size, total: 0, items: [] as ShoppingItem[] });
        }),
        finalize(() => {
          this.isLoading = false;
        })
      );
    })
  );

  readonly viewModel$ = combineLatest([
    this.itemsPage$,
    this.stats$,
    this.filter$,
    this.sort$,
    this.page$
  ]).pipe(
    map(([itemsPage, stats, filter, sort, page]) => {
      const items = itemsPage.items;
      const sorted = this.sortItems(items, sort);
      const pendingItems = sorted.filter((item) => !item.checked);
      const boughtItems = sorted.filter((item) => item.checked);

      return {
        items: sorted,
        filteredItems: sorted,
        pendingItems,
        boughtItems,
        checkedCount: stats.checkedCount,
        remainingCount: stats.pendingCount,
        completionPercent: stats.completionPercent,
        totalItems: itemsPage.total,
        allTotalCount: stats.totalCount,
        currentPage: page.index,
        pageSize: page.size
      };
    })
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

  onPageChange(pageIndex: number): void {
    const current = this.page$.value;
    this.page$.next({ index: pageIndex, size: current.size });
  }

  onPageSizeChange(pageSize: number): void {
    const current = this.page$.value;
    this.page$.next({ index: 1, size: pageSize });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  trackByItemId(_: number, item: ShoppingItem): string {
    return item.id;
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

