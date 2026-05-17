import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzIconModule,
    NzInputModule,
    NzSwitchModule,
    NzButtonModule,
    NzModalModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly defaultReminderHour = '20:30';
  private readonly reminderHourPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

  notificationEnabled = true;
  reminderHour = this.defaultReminderHour;

  private initialSettings: { notificationEnabled: boolean; reminderHour: string } = {
    notificationEnabled: true,
    reminderHour: this.defaultReminderHour
  };

  isSaveModalVisible = false;
  isSaving = false;

  constructor() {
    const settings = this.command.getNotificationSettings();
    this.notificationEnabled = settings.notificationEnabled;
    this.reminderHour = settings.reminderHour;
    this.initialSettings = {
      notificationEnabled: settings.notificationEnabled,
      reminderHour: settings.reminderHour
    };
  }

  get hasChanges(): boolean {
    return (
      this.notificationEnabled !== this.initialSettings.notificationEnabled ||
      this.reminderHour !== this.initialSettings.reminderHour
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
      this.notification.warning(
        this.i18n.translate('common.errorTitle'),
        `${this.i18n.translate('momApp.settings.reminderTime.desc')} (HH:mm)`
      );
      return;
    }

    const reminderHour = this.reminderHour.trim();
    this.isSaving = true;
    this.command.saveNotificationSettings(this.notificationEnabled, reminderHour).subscribe({
      next: () => {
        this.isSaving = false;
        this.isSaveModalVisible = false;
        this.reminderHour = reminderHour;
        this.initialSettings = {
          notificationEnabled: this.notificationEnabled,
          reminderHour
        };
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.settings.messages.saveSuccess')
        );
      },
      error: (err) => {
        this.isSaving = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || err?.message || this.i18n.translate('momApp.settings.messages.saveFailed')
        );
      }
    });
  }

  private isValidReminderHour(value: string): boolean {
    const normalized = value.trim();
    return this.reminderHourPattern.test(normalized);
  }
}
