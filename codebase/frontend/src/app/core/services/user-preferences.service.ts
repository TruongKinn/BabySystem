import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark';
export type ThemeAccent = 'orange' | 'blue' | 'emerald' | 'violet' | 'rose' | 'pink' | 'amber' | 'indigo' | 'graphite' | 'custom';
export type ThemeDensity = 'comfortable' | 'compact' | 'spacious';
export type ThemeRadius = 'soft' | 'sharp' | 'rounded' | 'pill';

export interface StoredPreferences {
  currency?: string;
  startOfWeek?: string;
  theme?: string;
  themeAccent?: string;
  themeDensity?: string;
  themeRadius?: string;
  themeCustomPrimary?: string;
  themeCustomSecondary?: string;
}

export interface AppPreferences {
  currency: string;
  startOfWeek: string;
  theme: ThemeMode;
  themeAccent: ThemeAccent;
  themeDensity: ThemeDensity;
  themeRadius: ThemeRadius;
  themeCustomPrimary: string;
  themeCustomSecondary: string;
}

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly STORAGE_KEY = 'mom_preferences';
  private readonly DEFAULT_PREFERENCES: AppPreferences = {
    currency: 'VND',
    startOfWeek: 'MONDAY',
    theme: 'light',
    themeAccent: 'orange',
    themeDensity: 'comfortable',
    themeRadius: 'soft',
    themeCustomPrimary: '#f97316',
    themeCustomSecondary: '#ec4899'
  };

  private readonly _currency$ = new BehaviorSubject<string>(this.loadPreferences().currency);
  private readonly _theme$ = new BehaviorSubject<ThemeMode>(this.loadPreferences().theme);

  readonly currency$: Observable<string> = this._currency$.asObservable();
  readonly theme$: Observable<ThemeMode> = this._theme$.asObservable();

  getCurrency(): string {
    return this._currency$.value;
  }

  getTheme(): ThemeMode {
    return this._theme$.value;
  }

  getPreferences(): AppPreferences {
    return this.loadPreferences();
  }

  reload(): void {
    const preferences = this.loadPreferences();
    this.publishPreferences(preferences);
    this.applyAppearance(preferences);
  }

  setCurrency(currency: string): void {
    if (!currency?.trim()) {
      return;
    }
    this.setPreferences({ currency });
  }

  setPreferences(
    preferences: Partial<StoredPreferences>,
    options: { allowPremiumTheme?: boolean } = {}
  ): AppPreferences {
    const nextPreferences = this.normalizePreferences({
      ...this.loadRawPreferences(),
      ...preferences
    });

    this.savePreferences(nextPreferences);
    this.publishPreferences(nextPreferences);
    this.applyAppearance(nextPreferences, options.allowPremiumTheme ?? true);
    return nextPreferences;
  }

  toggleTheme(options: { allowPremiumTheme?: boolean } = {}): ThemeMode {
    const nextTheme: ThemeMode = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setPreferences({ theme: nextTheme }, options);
    return nextTheme;
  }

  applyAppearance(
    preferences: Partial<StoredPreferences> = this.loadPreferences(),
    allowPremiumTheme = true
  ): void {
    if (typeof document === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    const normalized = this.normalizePreferences({
      ...this.loadRawPreferences(),
      ...preferences
    });
    const effectiveAccent = allowPremiumTheme ? normalized.themeAccent : this.DEFAULT_PREFERENCES.themeAccent;
    const effectiveDensity = allowPremiumTheme ? normalized.themeDensity : this.DEFAULT_PREFERENCES.themeDensity;
    const effectiveRadius = allowPremiumTheme ? normalized.themeRadius : this.DEFAULT_PREFERENCES.themeRadius;
    const effectivePrimary = allowPremiumTheme ? normalized.themeCustomPrimary : this.DEFAULT_PREFERENCES.themeCustomPrimary;
    const effectiveSecondary = allowPremiumTheme ? normalized.themeCustomSecondary : this.DEFAULT_PREFERENCES.themeCustomSecondary;
    const body = document.body;

    body.classList.toggle('dark-theme', normalized.theme === 'dark');
    body.classList.remove(
      'theme-accent-orange',
      'theme-accent-blue',
      'theme-accent-emerald',
      'theme-accent-violet',
      'theme-accent-rose',
      'theme-accent-pink',
      'theme-accent-amber',
      'theme-accent-indigo',
      'theme-accent-graphite',
      'theme-accent-custom'
    );
    body.classList.remove('theme-density-comfortable', 'theme-density-compact', 'theme-density-spacious');
    body.classList.remove('theme-radius-soft', 'theme-radius-sharp', 'theme-radius-rounded', 'theme-radius-pill');
    body.classList.add(`theme-accent-${effectiveAccent}`, `theme-density-${effectiveDensity}`, `theme-radius-${effectiveRadius}`);
    body.style.setProperty('--custom-theme-primary', effectivePrimary);
    body.style.setProperty('--custom-theme-secondary', effectiveSecondary);

    localStorage.setItem('theme', normalized.theme);
  }

  private loadPreferences(): AppPreferences {
    return this.normalizePreferences(this.loadRawPreferences());
  }

  private loadRawPreferences(): StoredPreferences {
    try {
      if (typeof window === 'undefined') {
        return {};
      }
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as StoredPreferences : {};
      if (!parsed.theme) {
        parsed.theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
      }
      return parsed;
    } catch {
      return {};
    }
  }

  private savePreferences(preferences: AppPreferences): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    localStorage.setItem('theme', preferences.theme);
  }

  private publishPreferences(preferences: AppPreferences): void {
    this._currency$.next(preferences.currency);
    this._theme$.next(preferences.theme);
  }

  private normalizePreferences(preferences: Partial<StoredPreferences>): AppPreferences {
    return {
      currency: this.normalizeCurrency(preferences.currency),
      startOfWeek: this.normalizeStartOfWeek(preferences.startOfWeek),
      theme: this.normalizeTheme(preferences.theme),
      themeAccent: this.normalizeThemeAccent(preferences.themeAccent),
      themeDensity: this.normalizeThemeDensity(preferences.themeDensity),
      themeRadius: this.normalizeThemeRadius(preferences.themeRadius),
      themeCustomPrimary: this.normalizeHexColor(preferences.themeCustomPrimary, this.DEFAULT_PREFERENCES.themeCustomPrimary),
      themeCustomSecondary: this.normalizeHexColor(preferences.themeCustomSecondary, this.DEFAULT_PREFERENCES.themeCustomSecondary)
    };
  }

  private normalizeCurrency(value: string | undefined): string {
    return value?.trim().toUpperCase() || this.DEFAULT_PREFERENCES.currency;
  }

  private normalizeStartOfWeek(value: string | undefined): string {
    const normalized = value?.trim().toUpperCase();
    return normalized === 'SUNDAY' ? 'SUNDAY' : this.DEFAULT_PREFERENCES.startOfWeek;
  }

  private normalizeTheme(value: string | undefined): ThemeMode {
    return value === 'dark' ? 'dark' : 'light';
  }

  private normalizeThemeAccent(value: string | undefined): ThemeAccent {
    if (
      value === 'blue' ||
      value === 'emerald' ||
      value === 'violet' ||
      value === 'rose' ||
      value === 'pink' ||
      value === 'amber' ||
      value === 'indigo' ||
      value === 'graphite' ||
      value === 'custom'
    ) {
      return value;
    }
    return this.DEFAULT_PREFERENCES.themeAccent;
  }

  private normalizeThemeDensity(value: string | undefined): ThemeDensity {
    if (value === 'compact' || value === 'spacious') {
      return value;
    }
    return this.DEFAULT_PREFERENCES.themeDensity;
  }

  private normalizeThemeRadius(value: string | undefined): ThemeRadius {
    if (value === 'sharp' || value === 'rounded' || value === 'pill') {
      return value;
    }
    return this.DEFAULT_PREFERENCES.themeRadius;
  }

  private normalizeHexColor(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized && /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
  }
}
