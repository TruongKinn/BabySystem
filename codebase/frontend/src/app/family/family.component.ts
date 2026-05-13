import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, switchMap } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { FamilyRole, SuperAppCommandService } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    NzAvatarModule,
    NzCardModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule
  ],
  templateUrl: './family.component.html',
  styleUrl: './family.component.css'
})
export class FamilyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly members$ = this.refresh$.pipe(switchMap(() => this.data.getFamilyMembers()));
  readonly roles: FamilyRole[] = ['MOM', 'DAD', 'GRANDMA', 'CAREGIVER', 'ADMIN'];

  isCreateMemberModalVisible = false;
  isSubmitting = false;

  readonly createMemberForm = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    role: ['CAREGIVER' as FamilyRole, [Validators.required]]
  });

  openCreateMemberModal(): void {
    this.isCreateMemberModalVisible = true;
  }

  closeCreateMemberModal(): void {
    this.isCreateMemberModalVisible = false;
    this.createMemberForm.reset({
      username: '',
      email: '',
      displayName: '',
      role: 'CAREGIVER'
    });
  }

  submitCreateMember(): void {
    if (this.createMemberForm.invalid) {
      this.createMemberForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.command
      .createFamilyMember({
        username: this.createMemberForm.controls.username.value?.trim() ?? '',
        email: this.createMemberForm.controls.email.value?.trim() ?? '',
        displayName: this.createMemberForm.controls.displayName.value?.trim() ?? '',
        role: this.createMemberForm.controls.role.value ?? 'CAREGIVER'
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeCreateMemberModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.family.messages.createSuccess')
          );
        },
        error: (err) => {
          this.isSubmitting = false;
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || this.i18n.translate('momApp.family.messages.createFailed')
          );
        }
      });
  }

  roleLabel(role: FamilyRole): string {
    return this.i18n.translate(`momApp.family.role.${role}`);
  }
}
