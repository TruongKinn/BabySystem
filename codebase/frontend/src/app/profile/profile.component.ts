import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, combineLatest, finalize, map, of, switchMap } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { PasswordStrengthComponent } from '../shared/components/password-strength/password-strength.component';
import { AuthService } from '../auth/auth.service';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import {
  FamilyMemberProfile,
  FamilyRelation,
  FamilyRole,
  ProfileInfo,
  ResolvedPremiumFeature,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

interface BabyProfile {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate: string;
}

interface FamilyTreeMember extends FamilyMemberProfile {
  roleLabel: string;
  relationLabel: string;
  isCurrentUser: boolean;
}

interface FamilyTreeNode {
  key: string;
  kind: 'member' | 'baby';
  relationKey: FamilyRelation | 'CON';
  role?: FamilyRole;
  userId: number | null;
  displayName: string;
  roleLabel: string | null;
  relationLabel: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  children: FamilyTreeNode[];
  spouse?: FamilyTreeNode;
}

interface ProfileViewModel extends ProfileInfo {
  role: FamilyRole;
  roleLabel: string;
  familyMembers: FamilyTreeMember[];
  familyTree: FamilyTreeNode[];
  premiumFeatures: ProfilePremiumFeature[];
}

interface ProfilePremiumFeature {
  key: string;
  label: string;
  enabled: boolean;
  sourceStatus: string;
  expiresAt: string | null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NzAvatarModule,
    NzCardModule,
    NzButtonModule,
    NzTagModule,
    NzIconModule,
    NzPopoverModule,
    NzToolTipModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    ReactiveFormsModule,
    PasswordStrengthComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private readonly maxAvatarSize = 30 * 1024 * 1024;
  private readonly authService = inject(AuthService);
  private readonly command = inject(SuperAppCommandService);
  private readonly i18n = inject(I18nService);
  private readonly message = inject(NzMessageService);
  private readonly fb = inject(FormBuilder);
  private readonly profileReload$ = new BehaviorSubject<void>(undefined);
  private readonly premiumFeatureOrder = [
    PREMIUM_FEATURE_KEYS.advancedGrowthTracking,
    PREMIUM_FEATURE_KEYS.smartReminders,
    PREMIUM_FEATURE_KEYS.aiCareAssistant,
    PREMIUM_FEATURE_KEYS.premiumReports,
    PREMIUM_FEATURE_KEYS.familyCollaborationPlus,
    PREMIUM_FEATURE_KEYS.medicalVaultExport,
    PREMIUM_FEATURE_KEYS.unlimitedMemory
  ];

  isUploadingAvatar = false;
  treeNodes: FamilyTreeNode[] = [];
  private allNodesFlat: FamilyTreeNode[] = [];

  isChangePasswordVisible = false;
  isChangingPassword = false;
  changePasswordForm: FormGroup;

  constructor() {
    this.changePasswordForm = this.fb.group(
      {
        oldPassword: ['', [Validators.required]],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#&()–\[{}\]:;',?\/*~$^+=<>]).{8,20}$/)
          ]
        ],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    if (!newPassword || !confirmPassword) return null;
    return newPassword.value === confirmPassword.value ? null : { mismatch: true };
  }

  openChangePassword(): void {
    this.changePasswordForm.reset();
    this.isChangePasswordVisible = true;
  }

  handleCancelChangePassword(): void {
    this.isChangePasswordVisible = false;
  }

  submitChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      Object.values(this.changePasswordForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.isChangingPassword = true;
    const { oldPassword, newPassword } = this.changePasswordForm.value;
    this.command
      .changePassword(oldPassword, newPassword)
      .pipe(finalize(() => (this.isChangingPassword = false)))
      .subscribe({
        next: () => {
          this.message.success(this.i18n.translate('auth.passwordCenter.change.successTitle'));
          this.isChangePasswordVisible = false;
        },
        error: (err) => {
          this.message.error(this.resolveUploadErrorMessage(err) || this.i18n.translate('auth.passwordCenter.change.changeErrorFallback'));
        }
      });
  }

  findNodeByRel(rel: string): FamilyTreeNode | undefined {
    return this.allNodesFlat.find((node) => node.relationKey === rel);
  }

  getSiblings(side: 'paternal' | 'maternal'): FamilyTreeNode[] {
    const gpRel = side === 'paternal' ? 'ONG_NOI' : 'ONG_NGOAI';
    const gmRel = side === 'paternal' ? 'BA_NOI' : 'BA_NGOAI';

    const grandparent = this.treeNodes.find((node) => node.relationKey === gpRel || node.relationKey === gmRel);
    if (grandparent) {
      let siblings = [...grandparent.children];
      if (grandparent.spouse) {
        const spouseNode = this.allNodesFlat.find((node) => node.userId === grandparent.spouse?.userId);
        if (spouseNode && spouseNode.children.length > 0) {
          siblings = [...siblings, ...spouseNode.children];
        }
      }

      const uniqueSiblings = siblings.filter((value, index, array) => {
        return array.findIndex((item) => item.userId === value.userId) === index;
      });

      return uniqueSiblings.sort((left, right) => {
        if (side === 'paternal') {
          if (left.relationKey === 'BO') return 1;
          if (right.relationKey === 'BO') return -1;
        } else {
          if (left.relationKey === 'ME') return -1;
          if (right.relationKey === 'ME') return 1;
        }
        return 0;
      });
    }

    const paternalRels = ['BO', 'BAC', 'CHU', 'CO'];
    const maternalRels = ['ME', 'DI', 'CAU', 'MO', 'THIM'];
    const targets = side === 'paternal' ? paternalRels : maternalRels;

    return this.allNodesFlat
      .filter((node) => targets.includes(node.relationKey))
      .filter((node) => {
        if (node.relationKey === 'ME') return side === 'maternal';
        if (node.relationKey === 'BO') return side === 'paternal';
        return true;
      })
      .sort((left, right) => {
        if (side === 'paternal') {
          if (left.relationKey === 'BO') return 1;
          if (right.relationKey === 'BO') return -1;
        } else {
          if (left.relationKey === 'ME') return -1;
          if (right.relationKey === 'ME') return 1;
        }
        return 0;
      });
  }

  getChildrenNodes(): FamilyTreeNode[] {
    const childRels = ['ANH_TRAI', 'CHI_GAI', 'EM_TRAI', 'EM_GAI', 'CON_TRAI', 'CON_GAI', 'CON'];
    return this.allNodesFlat.filter((node) => childRels.includes(node.relationKey) || node.kind === 'baby');
  }

  private flattenTree(nodes: FamilyTreeNode[], seen = new Set<number>()): void {
    nodes.forEach((node) => {
      if (node.userId && !seen.has(node.userId)) {
        this.allNodesFlat.push(node);
        seen.add(node.userId);
      }

      if (node.spouse && node.spouse.userId && !seen.has(node.spouse.userId)) {
        this.allNodesFlat.push(node.spouse);
        seen.add(node.spouse.userId);
      }

      this.flattenTree(node.children, seen);
    });
  }

  readonly profile$ = this.profileReload$.pipe(
    switchMap(() =>
      combineLatest({
        profile: this.command.getProfile(),
        familyMembers: this.command.getFamilyMembersDetailed(),
        premiumFeatures: this.command.getResolvedFamilyFeatures().pipe(
          catchError(() => of([] as ResolvedPremiumFeature[]))
        ),
        babies: this.command.getBabies().pipe(
          map((items) => items as BabyProfile[]),
          catchError(() => of([] as BabyProfile[]))
        )
      })
    ),
    map(({ profile, familyMembers, premiumFeatures, babies }): ProfileViewModel => {
      const currentMember = this.resolveCurrentFamilyMember(profile.userId, familyMembers);
      const enrichedMembers = familyMembers.map((member) => ({
        ...member,
        roleLabel: this.roleLabel(member.role),
        relationLabel: this.relationLabel(member.relation, member.role),
        isCurrentUser: currentMember ? member.userId === currentMember.userId : false
      }));

      const selectedProfile = currentMember
        ? {
            userId: currentMember.userId,
            displayName: currentMember.displayName,
            username: currentMember.username,
            email: currentMember.email,
            avatarUrl: currentMember.avatarUrl ?? profile.avatarUrl
          }
        : profile;

      const selectedRole = currentMember?.role ?? this.normalizeRole(this.authService.getRolesFromToken()[0]);
      const tree = this.buildFamilyTree(enrichedMembers, babies);

      this.treeNodes = tree;
      this.allNodesFlat = [];
      this.flattenTree(tree);

      return {
        ...selectedProfile,
        role: selectedRole,
        roleLabel: this.roleLabel(selectedRole),
        familyMembers: enrichedMembers,
        familyTree: tree,
        premiumFeatures: this.buildPremiumFeatures(premiumFeatures)
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

  initialFor(name: string): string {
    const normalized = name?.trim();
    return normalized ? normalized.charAt(0).toUpperCase() : 'U';
  }

  formatPremiumExpiry(raw: string | null): string {
    if (!raw?.trim()) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    const locale = this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
    return parsed.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private resolveCurrentFamilyMember(
    profileUserId: number | null,
    members: FamilyMemberProfile[]
  ): FamilyMemberProfile | null {
    const candidateUserIds = [profileUserId, this.command.getUserId()].filter(
      (value): value is number => Number.isFinite(value) && value! > 0
    );
    for (const userId of candidateUserIds) {
      const byId = members.find((member) => member.userId === userId);
      if (byId) {
        return byId;
      }
    }

    const storedUsername = this.authService.getStoredItem('atg_username')?.trim().toLowerCase();
    if (storedUsername) {
      const byUsername = members.find((member) => member.username.trim().toLowerCase() === storedUsername);
      if (byUsername) {
        return byUsername;
      }
    }

    const storedEmail = this.authService.getStoredItem('atg_email')?.trim().toLowerCase();
    if (storedEmail) {
      const byEmail = members.find((member) => member.email.trim().toLowerCase() === storedEmail);
      if (byEmail) {
        return byEmail;
      }
    }

    return null;
  }

  private buildFamilyTree(members: FamilyTreeMember[], babies: BabyProfile[]): FamilyTreeNode[] {
    const nodesByUserId = new Map<number, FamilyTreeNode>();
    const roots: FamilyTreeNode[] = [];
    const processedAsSpouse = new Set<number>();

    members.forEach((member) => {
      nodesByUserId.set(member.userId, {
        key: `member-${member.userId}`,
        kind: 'member',
        relationKey: member.relation,
        role: member.role,
        userId: member.userId,
        displayName: member.displayName,
        roleLabel: member.roleLabel,
        relationLabel: member.relationLabel,
        username: member.username,
        email: member.email,
        avatarUrl: member.avatarUrl,
        isCurrentUser: member.isCurrentUser,
        children: []
      });
    });

    const link = (hubbyId: number, wifeId: number) => {
      const hubby = nodesByUserId.get(hubbyId);
      const wife = nodesByUserId.get(wifeId);
      if (hubby && wife && hubbyId !== wifeId) {
        hubby.spouse = { ...wife, children: [] };
        processedAsSpouse.add(wifeId);
      }
    };

    const findId = (relation: FamilyRelation) => members.find((member) => member.relation === relation)?.userId;

    const ongNoiId = findId('ONG_NOI');
    const baNoiId = findId('BA_NOI');
    if (ongNoiId && baNoiId) {
      link(ongNoiId, baNoiId);
    }

    const ongNgoaiId = findId('ONG_NGOAI');
    const baNgoaiId = findId('BA_NGOAI');
    if (ongNgoaiId && baNgoaiId) {
      link(ongNgoaiId, baNgoaiId);
    }

    const dad = members.find((member) => member.relation === 'BO') ??
      members.find((member) => member.role === 'DAD' && !['ONG_NOI', 'ONG_NGOAI'].includes(member.relation));
    const mom = members.find((member) => member.relation === 'ME') ??
      members.find((member) => member.role === 'MOM' && !['BA_NOI', 'BA_NGOAI'].includes(member.relation));

    if (dad && mom) {
      link(dad.userId, mom.userId);
    }

    const cauId = findId('CAU');
    const moId = findId('MO');
    if (cauId && moId) {
      link(cauId, moId);
    }

    const bacId = findId('BAC');
    const thimId = findId('THIM');
    if (bacId && thimId) {
      link(bacId, thimId);
    }

    members.forEach((member) => {
      const node = nodesByUserId.get(member.userId)!;
      let parentId = member.parentUserId;

      if (!parentId) {
        const isGen1 =
          ['BO', 'ME', 'BAC', 'CHU', 'CO', 'DI', 'CAU', 'MO', 'THIM'].includes(member.relation) ||
          ['MOM', 'DAD'].includes(member.role);
        const isGen2 = ['ANH_TRAI', 'CHI_GAI', 'EM_TRAI', 'EM_GAI', 'CON_TRAI', 'CON_GAI', 'CON'].includes(member.relation);
        const isGrandparent =
          ['ONG_NOI', 'BA_NOI', 'ONG_NGOAI', 'BA_NGOAI'].includes(member.relation) || member.role === 'GRANDMA';

        if (isGrandparent) {
          parentId = null;
        } else if (isGen1) {
          if (['BO', 'BAC', 'CHU', 'CO'].includes(member.relation) || (member.role === 'DAD' && member.relation !== 'ME')) {
            parentId = ongNoiId || baNoiId || null;
          } else {
            parentId = ongNgoaiId || baNgoaiId || null;
          }
        } else if (isGen2) {
          parentId = dad?.userId || mom?.userId || null;
        } else {
          parentId = null;
        }
      }

      const parentNode = parentId ? nodesByUserId.get(parentId) : undefined;
      if (parentNode && parentNode.userId !== member.userId) {
        parentNode.children.push(node);
      } else if (!processedAsSpouse.has(member.userId)) {
        roots.push(node);
      }
    });

    const babyAnchor = (dad && nodesByUserId.get(dad.userId)) || (mom && nodesByUserId.get(mom.userId)) || roots[0];
    babies.forEach((baby) => {
      const babyNode: FamilyTreeNode = {
        key: `baby-${baby.id}`,
        kind: 'baby',
        relationKey: 'CON',
        userId: null,
        displayName: baby.name,
        roleLabel: null,
        relationLabel: this.babyRelationLabel(baby.gender),
        username: null,
        email: null,
        avatarUrl: null,
        isCurrentUser: false,
        children: []
      };

      if (babyAnchor) {
        babyAnchor.children.push(babyNode);
      } else {
        roots.push(babyNode);
      }
    });

    this.sortTree(roots);
    return roots;
  }

  private sortTree(nodes: FamilyTreeNode[]): void {
    nodes.sort((left, right) => {
      const leftOrder = this.nodeSortOrder(left);
      const rightOrder = this.nodeSortOrder(right);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.displayName.localeCompare(right.displayName);
    });

    nodes.forEach((node) => this.sortTree(node.children));
  }

  private nodeSortOrder(node: FamilyTreeNode): number {
    const order: Record<FamilyRelation | 'CON', number> = {
      ONG_NOI: 1,
      BA_NOI: 2,
      ONG_NGOAI: 3,
      BA_NGOAI: 4,
      BO: 5,
      ME: 6,
      BAC: 7,
      CHU: 8,
      CO: 9,
      DI: 10,
      CAU: 11,
      MO: 12,
      THIM: 13,
      ANH_TRAI: 14,
      CHI_GAI: 15,
      EM_TRAI: 16,
      EM_GAI: 17,
      CON_TRAI: 18,
      CON_GAI: 19,
      CON: 20,
      BAO_MAU: 21,
      THANH_VIEN_KHAC: 22
    };

    const relation = node.relationKey;
    const byRelation = order[relation] ?? 99;
    if (byRelation < 21) {
      return byRelation;
    }

    if (node.role === 'MOM') {
      return 6;
    }
    if (node.role === 'DAD') {
      return 5;
    }
    if (node.role === 'GRANDMA') {
      return 2;
    }

    return byRelation;
  }

  private normalizeRole(rawRole: string | undefined): FamilyRole {
    if (rawRole === 'MOM' || rawRole === 'DAD' || rawRole === 'GRANDMA' || rawRole === 'CAREGIVER' || rawRole === 'ADMIN') {
      return rawRole;
    }
    return 'MOM';
  }

  private roleLabel(role: FamilyRole): string {
    const translatedRole = this.i18n.translate(`momApp.family.role.${role}`);
    return translatedRole === `momApp.family.role.${role}` ? role : translatedRole;
  }

  private relationLabel(relation: FamilyRelation, role: FamilyRole): string {
    const relationKey = `momApp.family.relation.${relation}`;
    const translated = this.i18n.translate(relationKey);
    if (translated !== relationKey) {
      return translated;
    }
    return this.roleLabel(role);
  }

  private babyRelationLabel(gender: BabyProfile['gender']): string {
    if (gender === 'MALE') {
      return this.i18n.translate('momApp.profile.familyTree.babyBoy');
    }
    if (gender === 'FEMALE') {
      return this.i18n.translate('momApp.profile.familyTree.babyGirl');
    }
    return this.i18n.translate('momApp.profile.familyTree.babyChild');
  }

  private buildPremiumFeatures(features: ResolvedPremiumFeature[]): ProfilePremiumFeature[] {
    if (features.length === 0) {
      return [];
    }

    const orderByKey = new Map<string, number>(
      this.premiumFeatureOrder.map((featureKey, index) => [featureKey, index])
    );

    return [...features]
      .sort((left, right) => {
        const leftOrder = orderByKey.get(left.featureKey) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = orderByKey.get(right.featureKey) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
      })
      .map((feature) => ({
        key: feature.featureKey,
        label: this.premiumFeatureLabel(feature.featureKey),
        enabled: feature.enabled,
        sourceStatus: feature.sourceStatus,
        expiresAt: feature.expiresAt
      }));
  }

  private premiumFeatureLabel(featureKey: string): string {
    const key = `momApp.profile.premium.featureLabels.${featureKey}`;
    const translated = this.i18n.translate(key);
    return translated === key ? featureKey : translated;
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
