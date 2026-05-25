import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import { ResolvedPremiumFeature, SuperAppCommandService } from '../core/services/super-app-command.service';
import {
  AppPreferences,
  ThemeAccent,
  ThemeDensity,
  ThemeMode,
  ThemeRadius,
  UserPreferencesService
} from '../core/services/user-preferences.service';
import { I18nService } from '../i18n/i18n.service';
import { LanguageCode } from '../i18n/language.model';

interface SettingsSnapshot extends AppPreferences {
  notificationEnabled: boolean;
  reminderHour: string;
  language: LanguageCode;
}

interface ThemeChoice<T extends string> {
  value: T;
  labelKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzSwitchModule,
    NzTagModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly userPreferences = inject(UserPreferencesService);

  private readonly defaultReminderHour = '20:30';
  private readonly reminderHourPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  private readonly smartRemindersFeatureKey = PREMIUM_FEATURE_KEYS.smartReminders;
  private readonly themeCustomizationFeatureKey = PREMIUM_FEATURE_KEYS.themeCustomization;
  private readonly lockedThemeDefaults: Pick<AppPreferences, 'themeAccent' | 'themeDensity' | 'themeRadius' | 'themeCustomPrimary' | 'themeCustomSecondary'> = {
    themeAccent: 'orange',
    themeDensity: 'comfortable',
    themeRadius: 'soft',
    themeCustomPrimary: '#f97316',
    themeCustomSecondary: '#ec4899'
  };

  readonly accentOptions: Array<ThemeChoice<ThemeAccent>> = [
    {
      value: 'orange',
      labelKey: 'momApp.settings.themeStudio.accent.orange',
      descriptionKey: 'momApp.settings.themeStudio.accent.orangeDesc'
    },
    {
      value: 'blue',
      labelKey: 'momApp.settings.themeStudio.accent.blue',
      descriptionKey: 'momApp.settings.themeStudio.accent.blueDesc'
    },
    {
      value: 'emerald',
      labelKey: 'momApp.settings.themeStudio.accent.emerald',
      descriptionKey: 'momApp.settings.themeStudio.accent.emeraldDesc'
    },
    {
      value: 'violet',
      labelKey: 'momApp.settings.themeStudio.accent.violet',
      descriptionKey: 'momApp.settings.themeStudio.accent.violetDesc'
    },
    {
      value: 'rose',
      labelKey: 'momApp.settings.themeStudio.accent.rose',
      descriptionKey: 'momApp.settings.themeStudio.accent.roseDesc'
    },
    {
      value: 'amber',
      labelKey: 'momApp.settings.themeStudio.accent.amber',
      descriptionKey: 'momApp.settings.themeStudio.accent.amberDesc'
    },
    {
      value: 'indigo',
      labelKey: 'momApp.settings.themeStudio.accent.indigo',
      descriptionKey: 'momApp.settings.themeStudio.accent.indigoDesc'
    },
    {
      value: 'graphite',
      labelKey: 'momApp.settings.themeStudio.accent.graphite',
      descriptionKey: 'momApp.settings.themeStudio.accent.graphiteDesc'
    },
    {
      value: 'custom',
      labelKey: 'momApp.settings.themeStudio.accent.custom',
      descriptionKey: 'momApp.settings.themeStudio.accent.customDesc'
    }
  ];

  readonly densityOptions: Array<ThemeChoice<ThemeDensity>> = [
    {
      value: 'comfortable',
      labelKey: 'momApp.settings.themeStudio.density.comfortable',
      descriptionKey: 'momApp.settings.themeStudio.density.comfortableDesc'
    },
    {
      value: 'compact',
      labelKey: 'momApp.settings.themeStudio.density.compact',
      descriptionKey: 'momApp.settings.themeStudio.density.compactDesc'
    },
    {
      value: 'spacious',
      labelKey: 'momApp.settings.themeStudio.density.spacious',
      descriptionKey: 'momApp.settings.themeStudio.density.spaciousDesc'
    }
  ];

  readonly radiusOptions: Array<ThemeChoice<ThemeRadius>> = [
    {
      value: 'soft',
      labelKey: 'momApp.settings.themeStudio.radius.soft',
      descriptionKey: 'momApp.settings.themeStudio.radius.softDesc'
    },
    {
      value: 'sharp',
      labelKey: 'momApp.settings.themeStudio.radius.sharp',
      descriptionKey: 'momApp.settings.themeStudio.radius.sharpDesc'
    },
    {
      value: 'rounded',
      labelKey: 'momApp.settings.themeStudio.radius.rounded',
      descriptionKey: 'momApp.settings.themeStudio.radius.roundedDesc'
    },
    {
      value: 'pill',
      labelKey: 'momApp.settings.themeStudio.radius.pill',
      descriptionKey: 'momApp.settings.themeStudio.radius.pillDesc'
    }
  ];

  notificationEnabled = true;
  reminderHour = this.defaultReminderHour;
  smartRemindersLocked = false;
  themeCustomizationLocked = true;

  selectedTheme: ThemeMode = 'light';
  selectedLanguage: LanguageCode = 'vi';
  themeAccent: ThemeAccent = 'orange';
  themeDensity: ThemeDensity = 'comfortable';
  themeRadius: ThemeRadius = 'soft';
  themeCustomPrimary = '#f97316';
  themeCustomSecondary = '#ec4899';

  currency = 'VND';
  startOfWeek = 'MONDAY';

  private initialSettings: SettingsSnapshot = {
    notificationEnabled: true,
    reminderHour: this.defaultReminderHour,
    theme: 'light',
    themeAccent: 'orange',
    themeDensity: 'comfortable',
    themeRadius: 'soft',
    themeCustomPrimary: '#f97316',
    themeCustomSecondary: '#ec4899',
    language: 'vi',
    currency: 'VND',
    startOfWeek: 'MONDAY'
  };

  isSaveModalVisible = false;
  isSaving = false;

  ngOnInit(): void {
    this.loadPremiumFeatures();
    this.loadSettings();
  }

  get isAdminPortal(): boolean {
    return this.router.url.startsWith('/admin');
  }

  get isThemeStudioLocked(): boolean {
    return !this.isAdminPortal && this.themeCustomizationLocked;
  }

  get hasChanges(): boolean {
    return (
      this.notificationEnabled !== this.initialSettings.notificationEnabled ||
      this.reminderHour !== this.initialSettings.reminderHour ||
      this.selectedTheme !== this.initialSettings.theme ||
      this.themeAccent !== this.initialSettings.themeAccent ||
      this.themeDensity !== this.initialSettings.themeDensity ||
      this.themeRadius !== this.initialSettings.themeRadius ||
      this.themeCustomPrimary !== this.initialSettings.themeCustomPrimary ||
      this.themeCustomSecondary !== this.initialSettings.themeCustomSecondary ||
      this.selectedLanguage !== this.initialSettings.language ||
      this.currency !== this.initialSettings.currency ||
      this.startOfWeek !== this.initialSettings.startOfWeek
    );
  }

  get isReminderHourValid(): boolean {
    return this.isValidReminderHour(this.reminderHour);
  }

  get canSave(): boolean {
    return this.hasChanges && this.isReminderHourValid && !this.isSaving;
  }

  get reminderHourDisplay(): string {
    return this.isReminderHourValid ? this.reminderHour : this.defaultReminderHour;
  }

  get themeAccessLabelKey(): string {
    return this.isThemeStudioLocked
      ? 'momApp.settings.themeStudio.locked'
      : 'momApp.settings.themeStudio.unlocked';
  }

  get themePreviewClass(): string {
    return `theme-preview--${this.isThemeStudioLocked ? this.lockedThemeDefaults.themeAccent : this.themeAccent}`;
  }

  get previewPrimaryColor(): string {
    return this.isThemeStudioLocked
      ? this.lockedThemeDefaults.themeCustomPrimary
      : this.resolveAccentColors(this.themeAccent).primary;
  }

  get previewSecondaryColor(): string {
    return this.isThemeStudioLocked
      ? this.lockedThemeDefaults.themeCustomSecondary
      : this.resolveAccentColors(this.themeAccent).secondary;
  }

  get customColorLabel(): string {
    return `${this.themeCustomPrimary.toUpperCase()} / ${this.themeCustomSecondary.toUpperCase()}`;
  }

  restoreDefaults(): void {
    this.notificationEnabled = true;
    this.reminderHour = this.defaultReminderHour;
    this.selectedTheme = 'light';
    this.selectedLanguage = 'vi';
    this.currency = 'VND';
    this.startOfWeek = 'MONDAY';
    this.themeAccent = 'orange';
    this.themeDensity = 'comfortable';
    this.themeRadius = 'soft';
    this.themeCustomPrimary = '#f97316';
    this.themeCustomSecondary = '#ec4899';
    this.applyCurrentAppearance();
  }

  selectAccent(value: ThemeAccent): void {
    if (this.isThemeStudioLocked) {
      return;
    }
    this.themeAccent = value;
    this.applyCurrentAppearance();
  }

  updateCustomColor(kind: 'primary' | 'secondary', value: string): void {
    if (this.isThemeStudioLocked) {
      return;
    }

    const normalized = this.normalizeHexColor(value, kind === 'primary' ? this.themeCustomPrimary : this.themeCustomSecondary);
    if (kind === 'primary') {
      this.themeCustomPrimary = normalized;
    } else {
      this.themeCustomSecondary = normalized;
    }
    this.themeAccent = 'custom';
    this.applyCurrentAppearance();
  }

  selectDensity(value: ThemeDensity): void {
    if (this.isThemeStudioLocked) {
      return;
    }
    this.themeDensity = value;
    this.applyCurrentAppearance();
  }

  selectRadius(value: ThemeRadius): void {
    if (this.isThemeStudioLocked) {
      return;
    }
    this.themeRadius = value;
    this.applyCurrentAppearance();
  }

  onThemeModeChange(): void {
    this.applyCurrentAppearance();
  }

  openSaveModal(): void {
    if (!this.isReminderHourValid) {
      this.notification.warning(
        this.i18n.translate('common.errorTitle'),
        `${this.i18n.translate('momApp.settings.reminderTime.desc')} (HH:mm)`
      );
      return;
    }
    this.isSaveModalVisible = true;
  }

  closeSaveModal(): void {
    this.isSaveModalVisible = false;
  }

  confirmSaveSettings(): void {
    if (!this.isReminderHourValid) {
      return;
    }

    this.isSaving = true;
    const reminderHour = this.reminderHour.trim();
    const effectiveNotificationEnabled = this.smartRemindersLocked ? false : this.notificationEnabled;
    const effectiveThemePreferences = this.buildEffectiveThemePreferences();

    this.command.saveNotificationSettings(effectiveNotificationEnabled, reminderHour).subscribe({
      next: () => {
        this.userPreferences.setPreferences(
          {
            currency: this.currency,
            startOfWeek: this.startOfWeek,
            ...effectiveThemePreferences
          },
          { allowPremiumTheme: !this.isThemeStudioLocked }
        );

        const userId = this.command.getUserId();
        if (userId) {
          this.command.saveUserPreferences(userId, {
            ...effectiveThemePreferences,
            language: this.selectedLanguage,
            currency: this.currency,
            startOfWeek: this.startOfWeek,
            notificationEnabled: effectiveNotificationEnabled,
            reminderTime: reminderHour
          }).subscribe({
            error: (err) => console.error('Failed to save preferences to DB', err)
          });
        }

        if (this.selectedLanguage !== this.initialSettings.language) {
          void this.i18n.setLanguage(this.selectedLanguage);
        }

        this.isSaving = false;
        this.isSaveModalVisible = false;
        this.reminderHour = reminderHour;
        this.notificationEnabled = effectiveNotificationEnabled;
        this.updateInitialSettings();

        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.settings.messages.saveSuccess') || 'Settings saved successfully.'
        );
      },
      error: (err) => {
        this.isSaving = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || err?.message || this.i18n.translate('momApp.settings.messages.saveFailed') || 'Save failed'
        );
      }
    });
  }

  private loadSettings(): void {
    const userId = this.command.getUserId();
    if (!userId) {
      this.loadFallbackSettings();
      return;
    }

    this.command.getUserPreferences(userId).subscribe({
      next: (data: any) => this.applyLoadedPreferences(data ?? {}),
      error: (err) => {
        console.error('Failed to load user preferences', err);
        this.loadFallbackSettings();
      }
    });
  }

  private loadFallbackSettings(): void {
    const notificationSettings = this.command.getNotificationSettings();
    const preferences = this.userPreferences.getPreferences();

    this.notificationEnabled = notificationSettings.notificationEnabled;
    this.reminderHour = notificationSettings.reminderHour;
    this.selectedLanguage = this.i18n.getCurrentLanguage();
    this.applyPreferenceValues(preferences);
    this.applyReminderPremiumLock();
    this.applyCurrentAppearance();
    this.updateInitialSettings();
  }

  private applyLoadedPreferences(data: Partial<SettingsSnapshot>): void {
    const preferences = this.userPreferences.getPreferences();

    this.notificationEnabled = data.notificationEnabled ?? true;
    this.reminderHour = data.reminderHour ?? (data as any).reminderTime ?? this.defaultReminderHour;
    this.selectedLanguage = this.normalizeLanguage(data.language ?? this.i18n.getCurrentLanguage());
    this.applyPreferenceValues({
      ...preferences,
      ...data
    });
    this.applyReminderPremiumLock();
    this.applyCurrentAppearance();
    this.updateInitialSettings();
  }

  private applyPreferenceValues(preferences: Partial<AppPreferences>): void {
    this.selectedTheme = this.normalizeTheme(preferences.theme);
    this.themeAccent = this.normalizeThemeAccent(preferences.themeAccent);
    this.themeDensity = this.normalizeThemeDensity(preferences.themeDensity);
    this.themeRadius = this.normalizeThemeRadius(preferences.themeRadius);
    this.themeCustomPrimary = this.normalizeHexColor(preferences.themeCustomPrimary, '#f97316');
    this.themeCustomSecondary = this.normalizeHexColor(preferences.themeCustomSecondary, '#ec4899');
    this.currency = preferences.currency?.trim().toUpperCase() || 'VND';
    this.startOfWeek = preferences.startOfWeek === 'SUNDAY' ? 'SUNDAY' : 'MONDAY';
  }

  private updateInitialSettings(): void {
    this.initialSettings = {
      notificationEnabled: this.notificationEnabled,
      reminderHour: this.reminderHour,
      theme: this.selectedTheme,
      themeAccent: this.themeAccent,
      themeDensity: this.themeDensity,
      themeRadius: this.themeRadius,
      themeCustomPrimary: this.themeCustomPrimary,
      themeCustomSecondary: this.themeCustomSecondary,
      language: this.selectedLanguage,
      currency: this.currency,
      startOfWeek: this.startOfWeek
    };
  }

  private loadPremiumFeatures(): void {
    if (this.isAdminPortal) {
      this.smartRemindersLocked = false;
      this.themeCustomizationLocked = false;
      return;
    }

    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      this.smartRemindersLocked = !this.hasFeatureEnabled(features, this.smartRemindersFeatureKey, true);
      this.themeCustomizationLocked = !this.hasFeatureEnabled(features, this.themeCustomizationFeatureKey, false);
      this.applyReminderPremiumLock();
      this.applyCurrentAppearance();
      this.updateInitialSettings();
    });
  }

  private isValidReminderHour(value: string): boolean {
    return this.reminderHourPattern.test(value.trim());
  }

  private buildEffectiveThemePreferences(): Pick<AppPreferences, 'theme' | 'themeAccent' | 'themeDensity' | 'themeRadius' | 'themeCustomPrimary' | 'themeCustomSecondary'> {
    if (this.isThemeStudioLocked) {
      return {
        theme: this.selectedTheme,
        themeAccent: this.lockedThemeDefaults.themeAccent,
        themeDensity: this.lockedThemeDefaults.themeDensity,
        themeRadius: this.lockedThemeDefaults.themeRadius,
        themeCustomPrimary: this.lockedThemeDefaults.themeCustomPrimary,
        themeCustomSecondary: this.lockedThemeDefaults.themeCustomSecondary
      };
    }

    return {
      theme: this.selectedTheme,
      themeAccent: this.themeAccent,
      themeDensity: this.themeDensity,
      themeRadius: this.themeRadius,
      themeCustomPrimary: this.themeCustomPrimary,
      themeCustomSecondary: this.themeCustomSecondary
    };
  }

  private applyCurrentAppearance(): void {
    this.userPreferences.applyAppearance(
      {
        theme: this.selectedTheme,
        themeAccent: this.themeAccent,
        themeDensity: this.themeDensity,
        themeRadius: this.themeRadius,
        themeCustomPrimary: this.themeCustomPrimary,
        themeCustomSecondary: this.themeCustomSecondary
      },
      !this.isThemeStudioLocked
    );
  }

  private hasFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string, defaultEnabled: boolean): boolean {
    const matched = features.find((item) => item.featureKey === featureKey);
    return matched ? matched.enabled === true : defaultEnabled;
  }

  private applyReminderPremiumLock(): void {
    if (this.smartRemindersLocked) {
      this.notificationEnabled = false;
    }
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
      value === 'amber' ||
      value === 'indigo' ||
      value === 'graphite' ||
      value === 'custom'
    ) {
      return value;
    }
    return 'orange';
  }

  private normalizeThemeDensity(value: string | undefined): ThemeDensity {
    if (value === 'compact' || value === 'spacious') {
      return value;
    }
    return 'comfortable';
  }

  private normalizeThemeRadius(value: string | undefined): ThemeRadius {
    if (value === 'sharp' || value === 'rounded' || value === 'pill') {
      return value;
    }
    return 'soft';
  }

  private normalizeLanguage(value: string | undefined): LanguageCode {
    return value === 'en' ? 'en' : 'vi';
  }

  private normalizeHexColor(value: string | undefined, fallback: string): string {
    const normalized = value?.trim();
    return normalized && /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
  }

  private resolveAccentColors(accent: ThemeAccent): { primary: string; secondary: string } {
    if (accent === 'custom') {
      return {
        primary: this.themeCustomPrimary,
        secondary: this.themeCustomSecondary
      };
    }

    const colors: Record<Exclude<ThemeAccent, 'custom'>, { primary: string; secondary: string }> = {
      orange: { primary: '#f97316', secondary: '#ec4899' },
      blue: { primary: '#2563eb', secondary: '#0ea5e9' },
      emerald: { primary: '#059669', secondary: '#14b8a6' },
      violet: { primary: '#7c3aed', secondary: '#d946ef' },
      rose: { primary: '#e11d48', secondary: '#f97316' },
      amber: { primary: '#d97706', secondary: '#eab308' },
      indigo: { primary: '#4f46e5', secondary: '#06b6d4' },
      graphite: { primary: '#334155', secondary: '#64748b' }
    };
    return colors[accent];
  }
}
