import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface StoredPreferences {
  currency?: string;
  startOfWeek?: string;
}

/**
 * UserPreferencesService — Singleton service quản lý preferences của user.
 * Đọc từ localStorage (mom_preferences) và expose reactive currency$ stream.
 * Tất cả component hiển thị tiền nên inject service này để lấy currency.
 */
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly STORAGE_KEY = 'mom_preferences';
  private readonly DEFAULT_CURRENCY = 'VND';

  private readonly _currency$ = new BehaviorSubject<string>(this.loadCurrency());

  /** Observable stream — phát ra mỗi khi currency thay đổi */
  readonly currency$: Observable<string> = this._currency$.asObservable();

  /** Lấy currency hiện tại đồng bộ */
  getCurrency(): string {
    return this._currency$.value;
  }

  /**
   * Reload preferences từ localStorage.
   * Gọi sau khi Settings lưu thành công để notify toàn ứng dụng.
   */
  reload(): void {
    this._currency$.next(this.loadCurrency());
  }

  /**
   * Cập nhật currency trực tiếp (tránh phải đọc lại localStorage).
   * Gọi từ SettingsComponent ngay sau khi lưu.
   */
  setCurrency(currency: string): void {
    if (currency && currency.trim()) {
      this._currency$.next(currency.trim().toUpperCase());
    }
  }

  private loadCurrency(): string {
    try {
      if (typeof window === 'undefined') {
        return this.DEFAULT_CURRENCY;
      }
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return this.DEFAULT_CURRENCY;
      }
      const parsed: StoredPreferences = JSON.parse(raw);
      return parsed?.currency?.trim().toUpperCase() || this.DEFAULT_CURRENCY;
    } catch {
      return this.DEFAULT_CURRENCY;
    }
  }
}
