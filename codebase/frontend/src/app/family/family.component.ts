import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, switchMap } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import {
  FamilyMemberProfile,
  FamilyRelation,
  FamilyRole,
  ResolvedPremiumFeature,
  UpcomingBirthdayNotification,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
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
    NzSelectModule,
    NzTooltipModule,
    NzDividerModule,
    NzPopconfirmModule,
    NzDatePickerModule
  ],
  templateUrl: './family.component.html',
  styleUrl: './family.component.css'
})
export class FamilyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly familyCollaborationFeatureKey = PREMIUM_FEATURE_KEYS.familyCollaborationPlus;

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly members$ = this.refresh$.pipe(switchMap(() => this.command.getFamilyMembersDetailed()));
  readonly upcomingBirthdays$ = this.refresh$.pipe(
    switchMap(() => this.command.getUpcomingFamilyBirthdays(14))
  );
  readonly roles: FamilyRole[] = ['MOM', 'DAD', 'GRANDMA', 'CAREGIVER'];
  readonly relations: FamilyRelation[] = [
    'ONG_NOI',
    'BA_NOI',
    'ONG_NGOAI',
    'BA_NGOAI',
    'BO',
    'ME',
    'ANH_TRAI',
    'CHI_GAI',
    'EM_TRAI',
    'EM_GAI',
    'CON_TRAI',
    'CON_GAI',
    'CHU',
    'BAC',
    'CO',
    'DI',
    'CAU',
    'MO',
    'THIM',
    'BAO_MAU',
    'THANH_VIEN_KHAC'
  ];

  isCreateMemberModalVisible = false;
  isEditMemberModalVisible = false;
  isSubmitting = false;
  selectedMember: FamilyMemberProfile | null = null;
  allMembers: FamilyMemberProfile[] = [];
  familyCollaborationLocked = false;

  readonly editMemberForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    dateOfBirth: [null as Date | null],
    role: ['CAREGIVER' as FamilyRole, [Validators.required]],
    relation: ['BAO_MAU' as FamilyRelation, [Validators.required]],
    parentUserId: [null as number | null]
  });

  readonly createMemberForm = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    dateOfBirth: [null as Date | null],
    role: ['CAREGIVER' as FamilyRole, [Validators.required]],
    relation: ['BAO_MAU' as FamilyRelation, [Validators.required]],
    parentUserId: [null as number | null]
  });

  ngOnInit(): void {
    this.loadPremiumFeatures();
  }

  openCreateMemberModal(): void {
    if (this.familyCollaborationLocked) {
      this.notifyCollaborationPremiumRequired();
      return;
    }
    this.isCreateMemberModalVisible = true;
  }

  closeCreateMemberModal(): void {
    this.isCreateMemberModalVisible = false;
    this.createMemberForm.reset({
      username: '',
      email: '',
      displayName: '',
      dateOfBirth: null,
      role: 'CAREGIVER',
      relation: 'BAO_MAU',
      parentUserId: null
    });
  }

  submitCreateMember(): void {
    if (this.familyCollaborationLocked) {
      this.notifyCollaborationPremiumRequired();
      return;
    }

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
        dateOfBirth: this.normalizeDateInput(this.createMemberForm.controls.dateOfBirth.value),
        role: this.createMemberForm.controls.role.value ?? 'CAREGIVER',
        relation:
          this.createMemberForm.controls.relation.value ??
          this.defaultRelationByRole(this.createMemberForm.controls.role.value ?? 'CAREGIVER'),
        parentUserId: this.createMemberForm.controls.parentUserId.value ?? null
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
          if (this.isPremiumRequired(err)) {
            this.notifyCollaborationPremiumRequired();
            return;
          }
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err.message || this.i18n.translate('momApp.family.messages.createFailed')
          );
        }
      });
  }

  roleLabel(role: FamilyRole): string {
    return this.i18n.translate(`momApp.family.role.${role}`);
  }

  relationLabel(relation: FamilyRelation): string {
    return this.i18n.translate(`momApp.family.relation.${relation}`);
  }

  roleIcon(role: FamilyRole): string {
    const map: Record<FamilyRole, string> = {
      MOM: 'heart',
      DAD: 'user',
      GRANDMA: 'star',
      CAREGIVER: 'smile',
      ADMIN: 'setting'
    };
    return map[role] ?? 'user';
  }

  roleGradient(role: FamilyRole): string {
    const map: Record<FamilyRole, string> = {
      MOM: 'linear-gradient(135deg, #f093fb, #f5576c)',
      DAD: 'linear-gradient(135deg, #4facfe, #00f2fe)',
      GRANDMA: 'linear-gradient(135deg, #fa709a, #fee140)',
      CAREGIVER: 'linear-gradient(135deg, #43e97b, #38f9d7)',
      ADMIN: 'linear-gradient(135deg, #667eea, #764ba2)'
    };
    return map[role] ?? 'linear-gradient(135deg, #a8a8a8, #6c6c6c)';
  }

  openEditMemberModal(member: FamilyMemberProfile, members: FamilyMemberProfile[]): void {
    if (this.familyCollaborationLocked) {
      this.notifyCollaborationPremiumRequired();
      return;
    }

    this.selectedMember = member;
    this.allMembers = members;
    this.editMemberForm.patchValue({
      displayName: member.displayName,
      username: member.username !== '-' ? member.username : '',
      email: member.email !== '-' ? member.email : '',
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : null,
      role: member.role,
      relation: member.relation,
      parentUserId: member.parentUserId
    });
    this.isEditMemberModalVisible = true;
  }

  closeEditMemberModal(): void {
    this.isEditMemberModalVisible = false;
    this.selectedMember = null;
    this.allMembers = [];
  }

  submitUpdateMember(): void {
    if (this.familyCollaborationLocked) {
      this.notifyCollaborationPremiumRequired();
      return;
    }

    if (this.editMemberForm.invalid || !this.selectedMember) {
      this.editMemberForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.command
      .updateFamilyMember(Number(this.selectedMember.userId), {
        displayName: this.editMemberForm.controls.displayName.value?.trim() ?? '',
        username: this.editMemberForm.controls.username.value?.trim() ?? '',
        email: this.editMemberForm.controls.email.value?.trim() ?? '',
        dateOfBirth: this.normalizeDateInput(this.editMemberForm.controls.dateOfBirth.value),
        role: this.editMemberForm.controls.role.value!,
        relation: this.editMemberForm.controls.relation.value!,
        parentUserId: this.editMemberForm.controls.parentUserId.value ?? null
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeEditMemberModal();
          this.refresh$.next();
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            this.i18n.translate('momApp.family.messages.updateSuccess')
          );
        },
        error: (err) => {
          if (this.isPremiumRequired(err)) {
            this.isSubmitting = false;
            this.notifyCollaborationPremiumRequired();
            return;
          }

          const role = this.editMemberForm.controls.role.value!;
          this.command.updateFamilyMemberRole(Number(this.selectedMember!.userId), role).subscribe({
            next: () => {
              this.isSubmitting = false;
              this.closeEditMemberModal();
              this.refresh$.next();
              this.notification.success(
                this.i18n.translate('momApp.common.success'),
                this.i18n.translate('momApp.family.messages.updateSuccess')
              );
            },
            error: (err2) => {
              this.isSubmitting = false;
              if (this.isPremiumRequired(err2)) {
                this.notifyCollaborationPremiumRequired();
                return;
              }
              this.notification.error(
                this.i18n.translate('common.errorTitle'),
                err2.message || err.message || this.i18n.translate('momApp.family.messages.updateFailed')
              );
            }
          });
        }
      });
  }

  deleteMember(userId: number): void {
    if (this.familyCollaborationLocked) {
      this.notifyCollaborationPremiumRequired();
      return;
    }

    this.isSubmitting = true;
    this.command.removeFamilyMember(userId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.refresh$.next();
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.family.messages.deleteSuccess')
        );
      },
      error: (err) => {
        this.isSubmitting = false;
        if (this.isPremiumRequired(err)) {
          this.notifyCollaborationPremiumRequired();
          return;
        }
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.error?.message || this.i18n.translate('momApp.family.messages.deleteFailed')
        );
      }
    });
  }

  getParentName(parentUserId: number | null, members: FamilyMemberProfile[]): string {
    if (!parentUserId) {
      return '';
    }

    const parent = members.find((member) => member.userId === parentUserId);
    return parent?.displayName ?? `#${parentUserId}`;
  }

  formatBirthday(dateOfBirth: string | null | undefined): string {
    if (!dateOfBirth?.trim()) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const parsed = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return dateOfBirth;
    }

    return parsed.toLocaleDateString();
  }

  upcomingBirthdayLabel(item: UpcomingBirthdayNotification): string {
    if (item.daysUntilBirthday === 0) {
      return this.i18n.translate('momApp.family.birthdays.today');
    }
    if (item.daysUntilBirthday === 1) {
      return this.i18n.translate('momApp.family.birthdays.tomorrow');
    }
    return this.i18n.translate('momApp.family.birthdays.inDays', { days: item.daysUntilBirthday });
  }

  private normalizeDateInput(raw: any): string | null {
    if (!raw) return null;
    if (raw instanceof Date) {
      const year = raw.getFullYear();
      const month = String(raw.getMonth() + 1).padStart(2, '0');
      const date = String(raw.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    }
    const value = String(raw).trim();
    return value ? value : null;
  }

  private defaultRelationByRole(role: FamilyRole): FamilyRelation {
    if (role === 'MOM') {
      return 'ME';
    }
    if (role === 'DAD') {
      return 'BO';
    }
    if (role === 'GRANDMA') {
      return 'BA_NOI';
    }
    if (role === 'CAREGIVER') {
      return 'BAO_MAU';
    }
    return 'THANH_VIEN_KHAC';
  }

  private loadPremiumFeatures(): void {
    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      this.familyCollaborationLocked = !this.hasFeatureEnabled(features, this.familyCollaborationFeatureKey);
    });
  }

  private hasFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string): boolean {
    const matched = features.find((item) => item.featureKey === featureKey);
    return matched ? matched.enabled : true;
  }

  private isPremiumRequired(err: any): boolean {
    const message = String(err?.message ?? '');
    return message.includes(`PREMIUM_REQUIRED:${this.familyCollaborationFeatureKey}`);
  }

  private notifyCollaborationPremiumRequired(): void {
    this.notification.warning(
      this.i18n.translate('common.errorTitle'),
      this.i18n.translate('momApp.family.messages.collaborationPremiumRequired')
    );
  }
}
