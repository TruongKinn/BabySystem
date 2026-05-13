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

  notificationEnabled = true;
  reminderHour = '20:30';

  isSaveModalVisible = false;
  isSaving = false;

  constructor() {
    const settings = this.command.getNotificationSettings();
    this.notificationEnabled = settings.notificationEnabled;
    this.reminderHour = settings.reminderHour;
  }

  openSaveModal(): void {
    this.isSaveModalVisible = true;
  }

  closeSaveModal(): void {
    this.isSaveModalVisible = false;
  }

  confirmSaveSettings(): void {
    this.isSaving = true;
    this.command.saveNotificationSettings(this.notificationEnabled, this.reminderHour).subscribe({
      next: () => {
        this.isSaving = false;
        this.isSaveModalVisible = false;
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.settings.messages.saveSuccess')
        );
      },
      error: (err) => {
        this.isSaving = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.settings.messages.saveFailed')
        );
      }
    });
  }
}
