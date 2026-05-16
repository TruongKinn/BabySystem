import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, finalize, map, switchMap } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../auth/auth.service';
import { SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule, NzAvatarModule, NzCardModule, NzButtonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private readonly maxAvatarSize = 30 * 1024 * 1024;
  private readonly authService = inject(AuthService);
  private readonly command = inject(SuperAppCommandService);
  private readonly i18n = inject(I18nService);
  private readonly message = inject(NzMessageService);
  private readonly profileReload$ = new BehaviorSubject<void>(undefined);

  isUploadingAvatar = false;

  readonly profile$ = this.profileReload$.pipe(
    switchMap(() => this.command.getProfile()),
    map((profile) => {
      const role = this.authService.getRolesFromToken()[0] || 'MOM';
      const translatedRole = this.i18n.translate(`momApp.family.role.${role}`);

      return {
        ...profile,
        role,
        roleLabel: translatedRole === `momApp.family.role.${role}` ? role : translatedRole
      };
    })
  );

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.message.warning(this.i18n.translate('momApp.profile.messages.selectImageOnly'));
      return;
    }

    if (file.size > this.maxAvatarSize) {
      this.message.warning(this.i18n.translate('momApp.profile.messages.fileTooLarge'));
      return;
    }

    this.isUploadingAvatar = true;
    this.command
      .uploadProfileAvatar(file)
      .pipe(finalize(() => (this.isUploadingAvatar = false)))
      .subscribe({
        next: (avatarUrl) => {
          this.authService.setAvatarUrl(avatarUrl || null);
          this.profileReload$.next();
          this.message.success(this.i18n.translate('momApp.profile.messages.uploadSuccess'));
        },
        error: (error) => {
          this.message.error(this.resolveUploadErrorMessage(error));
        }
      });
  }

  private resolveUploadErrorMessage(error: unknown): string {
    const fallback = this.i18n.translate('momApp.profile.messages.uploadFailed');
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error && typeof error.error === 'object') {
      const message = (error.error as { message?: string }).message;
      if (message?.trim()) {
        return message;
      }
    }

    return fallback;
  }
}
