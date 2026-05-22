import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import { ResolvedPremiumFeature, SuperAppCommandService } from '../core/services/super-app-command.service';
import { UserPreferencesService } from '../core/services/user-preferences.service';
import { I18nService } from '../i18n/i18n.service';
import { LanguageCode } from '../i18n/language.model';

interface AppPreferences {
  currency: string;
  startOfWeek: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzIconModule,
    NzInputModule,
    NzSwitchModule,
    NzButtonModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userPreferences = inject(UserPreferencesService);
  
  private readonly defaultReminderHour = '20:30';
  private readonly reminderHourPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  private readonly smartRemindersFeatureKey = PREMIUM_FEATURE_KEYS.smartReminders;

  // Notifications
  notificationEnabled = true;
  reminderHour = this.defaultReminderHour;
  smartRemindersLocked = false;

  // Appearance
  selectedTheme: 'light' | 'dark' = 'light';
  selectedLanguage: LanguageCode = 'vi';

  // Preferences
  currency = 'VND';
  startOfWeek = 'MONDAY';

  private initialSettings = {
    notificationEnabled: true,
    reminderHour: this.defaultReminderHour,
    theme: 'light' as 'light' | 'dark',
    language: 'vi' as LanguageCode,
    currency: 'VND',
    startOfWeek: 'MONDAY'
  };

  isSaveModalVisible = false;
  isSaving = false;

  ngOnInit(): void {
    this.loadPremiumFeatures();

    // 1. Fetch user preferences from DB via command service
    const userId = this.command.getUserId();
    if (userId) {
      this.command.getUserPreferences(userId).subscribe({
        next: (res: any) => {
          const data = res?.data || {};
          
          // Notifications
          this.notificationEnabled = data.notificationEnabled ?? true;
          this.reminderHour = data.reminderTime ?? this.defaultReminderHour;

          // Appearance
          if (data.theme) {
            this.selectedTheme = data.theme;
          } else if (isPlatformBrowser(this.platformId)) {
            this.selectedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
          }
          if (data.language) {
            this.selectedLanguage = data.language;
          } else {
            this.selectedLanguage = this.i18n.getCurrentLanguage();
          }

          // Preferences
          this.currency = data.currency || 'VND';
          this.startOfWeek = data.startOfWeek || 'MONDAY';

          this.applyReminderPremiumLock();
          this.updateInitialSettings();
        },
        error: (err) => {
          console.error('Failed to load user preferences', err);
          this.loadFallbackSettings();
        }
      });
    } else {
      this.loadFallbackSettings();
    }
  }

  private loadFallbackSettings(): void {
    const notifSettings = this.command.getNotificationSettings();
    this.notificationEnabled = notifSettings.notificationEnabled;
    this.reminderHour = notifSettings.reminderHour;

    this.selectedLanguage = this.i18n.getCurrentLanguage();
    if (isPlatformBrowser(this.platformId)) {
      this.selectedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }

    const prefs = this.getPreferences();
    this.currency = prefs.currency;
    this.startOfWeek = prefs.startOfWeek;

    this.applyReminderPremiumLock();
    this.updateInitialSettings();
  }

  private updateInitialSettings(): void {
    this.initialSettings = {
      notificationEnabled: this.notificationEnabled,
      reminderHour: this.reminderHour,
      theme: this.selectedTheme,
      language: this.selectedLanguage,
      currency: this.currency,
      startOfWeek: this.startOfWeek
    };
  }

  get hasChanges(): boolean {
    return (
      this.notificationEnabled !== this.initialSettings.notificationEnabled ||
      this.reminderHour !== this.initialSettings.reminderHour ||
      this.selectedTheme !== this.initialSettings.theme ||
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

  restoreDefaults(): void {
    this.notificationEnabled = true;
    this.reminderHour = this.defaultReminderHour;
    this.selectedTheme = 'light';
    this.selectedLanguage = 'vi';
    this.currency = 'VND';
    this.startOfWeek = 'MONDAY';
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
    if (!this.isReminderHourValid) return;

    this.isSaving = true;
    const reminderHour = this.reminderHour.trim();
    const effectiveNotificationEnabled = this.smartRemindersLocked ? false : this.notificationEnabled;

    // 1. Save Notification settings via API (Scheduled one-time push)
    this.command.saveNotificationSettings(effectiveNotificationEnabled, reminderHour).subscribe({
      next: () => {
        // 2. Save Local Preferences & Appearance
        this.savePreferences({ currency: this.currency, startOfWeek: this.startOfWeek });
        
        const userId = this.command.getUserId();
        if (userId) {
          this.command.saveUserPreferences(userId, {
            theme: this.selectedTheme,
            language: this.selectedLanguage,
            currency: this.currency,
            startOfWeek: this.startOfWeek,
            notificationEnabled: effectiveNotificationEnabled,
            reminderTime: reminderHour
          }).subscribe({
            error: e => console.error('Failed to save preferences to DB', e)
          });
        }
        
        if (this.selectedTheme === 'dark') {
          document.body.classList.add('dark-theme');
          localStorage.setItem('theme', 'dark');
        } else {
          document.body.classList.remove('dark-theme');
          localStorage.setItem('theme', 'light');
        }

        // Notify toàn ứng dụng về currency mới ngay lập tức
        this.userPreferences.setCurrency(this.currency);

        if (this.selectedLanguage !== this.initialSettings.language) {
          void this.i18n.setLanguage(this.selectedLanguage);
        }

        // 3. Complete saving
        this.isSaving = false;
        this.isSaveModalVisible = false;
        this.reminderHour = reminderHour;
        this.notificationEnabled = effectiveNotificationEnabled;
        this.updateInitialSettings();
        
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.settings.messages.saveSuccess') || 'Lưu cài đặt thành công!'
        );
      },
      error: (err) => {
        this.isSaving = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || err?.message || this.i18n.translate('momApp.settings.messages.saveFailed') || 'Lưu thất bại'
        );
      }
    });
  }

  private loadPremiumFeatures(): void {
    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      this.smartRemindersLocked = !this.hasFeatureEnabled(features, this.smartRemindersFeatureKey);
      this.applyReminderPremiumLock();
      this.updateInitialSettings();
    });
  }

  private isValidReminderHour(value: string): boolean {
    const normalized = value.trim();
    return this.reminderHourPattern.test(normalized);
  }

  private getPreferences(): AppPreferences {
    if (typeof window === 'undefined') return { currency: 'VND', startOfWeek: 'MONDAY' };
    const raw = localStorage.getItem('mom_preferences');
    if (!raw) return { currency: 'VND', startOfWeek: 'MONDAY' };
    try {
      const parsed = JSON.parse(raw);
      return {
        currency: parsed.currency || 'VND',
        startOfWeek: parsed.startOfWeek || 'MONDAY'
      };
    } catch {
      return { currency: 'VND', startOfWeek: 'MONDAY' };
    }
  }

  private savePreferences(prefs: AppPreferences): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mom_preferences', JSON.stringify(prefs));
    }
  }

  private hasFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string): boolean {
    const matched = features.find((item) => item.featureKey === featureKey);
    return matched ? matched.enabled : true;
  }

  private applyReminderPremiumLock(): void {
    if (this.smartRemindersLocked) {
      this.notificationEnabled = false;
    }
  }
}
