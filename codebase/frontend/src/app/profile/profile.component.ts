import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { map } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCardModule } from 'ng-zorro-antd/card';
import { AuthService } from '../auth/auth.service';
import { SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule, NzAvatarModule, NzCardModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly command = inject(SuperAppCommandService);
  private readonly i18n = inject(I18nService);

  readonly profile$ = this.command.getProfile().pipe(
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
}
