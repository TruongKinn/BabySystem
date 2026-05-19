import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef } from 'ng-zorro-antd/modal';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzFormModule } from 'ng-zorro-antd/form';

import { I18nService } from '../../../i18n/i18n.service';
import { API_CONFIG } from '../../../shared/constants/api.constant';

export interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  roleType: 'USER' | 'ADMIN' | 'OWNER';
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  createdAt?: string;
  lastLogin?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface FamilyMember {
  userId: number;
  displayName: string;
  role: string;
  relation?: string;
  parentUserId?: number;
}

export interface Family {
  id: number;
  name: string;
  createdByUserId?: number;
  members?: FamilyMember[];
  currentUserRole?: string; // vai trÃ² cá»§a user Ä‘ang xem trong gia Ä‘Ã¬nh nÃ y
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Baby {
  id: number;
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  weightKg?: number;
  heightCm?: number;
  familyId: number;
  isEditing?: boolean;
  editData?: {
    name: string;
    birthDate: Date;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    weightKg?: number;
    heightCm?: number;
  };
}

interface GrowthRecord {
  id: number;
  babyId: number;
  measuredAt: string;
  weightKg?: number | string | null;
  heightCm?: number | string | null;
}

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
type UserRoleType = 'USER' | 'ADMIN' | 'OWNER';

@Component({
  selector: 'app-admin-user-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzGridModule,
    NzAvatarModule,
    NzIconModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzSpinModule,
    NzFormModule
  ],
  templateUrl: './admin-user-detail-modal.component.html',
  styleUrls: ['./admin-user-detail-modal.component.css']
})
export class AdminUserDetailModalComponent implements OnInit {
  private _user: AdminUser | null = null;

  @Input()
  set user(value: AdminUser | null) {
    this._user = value;
    this.initializeFromUser();
  }

  get user(): AdminUser | null {
    return this._user;
  }

  // Base API configuration
  private readonly apiBase = API_CONFIG.GATEWAY_URL;

  isLoading = true;
  isFamiliesLoading = true;
  isBabiesLoading = true;

  userDetail: AdminUser | null = null;
  families: Family[] = [];
  babies: Baby[] = [];

  private loadedUserId: number | null = null;

  constructor(
    private readonly modalRef: NzModalRef,
    private readonly http: HttpClient,
    private readonly message: NzMessageService,
    public readonly i18n: I18nService,
    @Optional() @Inject(NZ_MODAL_DATA) private readonly modalData: { user?: AdminUser } | null
  ) {}

  ngOnInit(): void {
    if (this.modalData?.user) {
      this.user = this.modalData.user;
      return;
    }
    this.initializeFromUser();
  }

  private initializeFromUser(): void {
    const currentUser = this.user;
    if (!currentUser) {
      return;
    }

    this.userDetail = { ...currentUser };
    if (this.loadedUserId === currentUser.id) {
      return;
    }

    this.loadedUserId = currentUser.id;
    this.loadAllData();
  }

  loadAllData(): void {
    const currentUser = this.user;
    if (!currentUser) {
      this.isLoading = false;
      this.isFamiliesLoading = false;
      this.isBabiesLoading = false;
      return;
    }

    this.isLoading = true;
    this.isFamiliesLoading = true;
    this.isBabiesLoading = true;

    // 1. Fetch detailed user profile
    this.http.get<AdminUser>(`${this.apiBase}/auth/account/user/${currentUser.id}`)
      .pipe(
        catchError((err) => {
          console.error('Error loading user profile:', err);
          return of(currentUser); // fallback to passed user object
        })
      )
      .subscribe((res: any) => {
        // Auth API tráº£ vá» cÃ¡c field khÃ¡c tÃªn (type, firstName/lastName, dateOfBirth).
        // Pháº£i merge thá»§ cÃ´ng Ä‘á»ƒ khÃ´ng máº¥t dá»¯ liá»‡u Ä‘Ã£ map Ä‘Ãºng tá»« bÃªn ngoÃ i.
        const fullName = res.fullName
          || ((res.firstName || '') + ' ' + (res.lastName || '')).trim()
          || currentUser.fullName;
        this.userDetail = {
          ...currentUser,             // giá»¯ toÃ n bá»™ dá»¯ liá»‡u gá»‘c
          fullName,
          phone: res.phone || currentUser.phone || 'N/A',
          avatarUrl: res.avatarUrl || currentUser.avatarUrl || '',
          gender: res.gender || currentUser.gender || '',
          dateOfBirth: res.dateOfBirth || currentUser.dateOfBirth || '',
          createdAt: res.createdAt || currentUser.createdAt || '',
          lastLogin: res.lastLogin || currentUser.lastLogin || '',
          // roleType: giá»¯ tá»« currentUser (dÃ¹ng lÃºc má»Ÿ modal) vÃ¬ Ä‘Ã£ map Ä‘Ãºng tá»« type
        };
        this.isLoading = false;
      });

    // 2. Fetch families using the admin endpoint to bypass self-user checks
    this.http.get<ApiEnvelope<Family[]>>(`${this.apiBase}/account/admin/users/${currentUser.id}/families`)
      .pipe(
        catchError((err) => {
          console.error('Error loading user families:', err);
          this.message.error(this.i18n.translate('momApp.admin.families.messages.loadFailed'));
          return of({ success: false, message: 'Load failed', data: [] });
        }),
        finalize(() => {
          this.isFamiliesLoading = false;
        })
      )
      .subscribe((res) => {
        this.families = (res.data || []).map((family: any) => ({
          ...family,
          // TÃ¬m vai trÃ² cá»§a user Ä‘ang xem trong danh sÃ¡ch members cá»§a gia Ä‘Ã¬nh
          currentUserRole: family.members?.find((m: any) => m.userId === currentUser.id)?.role || ''
        }));
        if (this.families.length > 0) {
          this.loadBabiesForFamilies();
        } else {
          this.isBabiesLoading = false;
          this.babies = [];
        }
      });
  }

  loadBabiesForFamilies(): void {
    if (!this.families.length) {
      this.babies = [];
      this.isBabiesLoading = false;
      return;
    }

    this.isBabiesLoading = true;
    const familyRequests = this.families.map((family) =>
      this.http
        .get<ApiEnvelope<Baby[]> | Baby[]>(`${this.apiBase}/baby/babies`, {
          params: new HttpParams().set('familyId', String(family.id))
        })
        .pipe(
          map((response) => (Array.isArray(response) ? response : (response?.data ?? []))),
          switchMap((familyBabies) => {
            if (!familyBabies.length) {
              return of([] as Baby[]);
            }

            return forkJoin(
              familyBabies.map((baby) =>
                this.getGrowthRecordsForBaby(baby.id).pipe(
                  map((records) => this.mergeBabyWithLatestGrowth(baby, family.id, records))
                )
              )
            );
          }),
          catchError((err) => {
            console.error(`Error loading babies for family ${family.id}:`, err);
            return of([] as Baby[]);
          })
        )
    );

    forkJoin(familyRequests)
      .pipe(
        finalize(() => {
          this.isBabiesLoading = false;
        })
      )
      .subscribe((results) => {
        this.babies = results.flat();
      });
  }

  // Action: Change role of member in family
  changeMemberRole(familyId: number, newRole: 'OWNER' | 'MEMBER'): void {
    const currentUser = this.user;
    if (!currentUser) {
      return;
    }

    this.isFamiliesLoading = true;
    this.http.put(`${this.apiBase}/account/admin/families/${familyId}/members/${currentUser.id}/role?role=${newRole}`, {})
      .pipe(
        finalize(() => {
          this.isFamiliesLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.message.success(this.i18n.translate('momApp.admin.users.detailModal.saveSuccess'));
          // Reload families
          this.loadFamiliesOnly();
        },
        error: (err) => {
          console.error('Error changing member role:', err);
          this.message.error(this.i18n.translate('momApp.admin.families.messages.updateFailed'));
        }
      });
  }

  private loadFamiliesOnly(): void {
    const currentUser = this.user;
    if (!currentUser) {
      return;
    }

    this.isFamiliesLoading = true;
    this.http.get<ApiEnvelope<Family[]>>(`${this.apiBase}/account/admin/users/${currentUser.id}/families`)
      .pipe(
        finalize(() => {
          this.isFamiliesLoading = false;
        })
      )
      .subscribe({
        next: (res) => {
          this.families = (res.data || []).map((family: any) => ({
            ...family,
            currentUserRole: family.members?.find((m: any) => m.userId === currentUser.id)?.role || ''
          }));
        },
        error: (err) => {
          console.error('Error reloading families:', err);
        }
      });
  }

  // Action: Remove member from family
  removeMemberFromFamily(familyId: number): void {
    const currentUser = this.user;
    if (!currentUser) {
      return;
    }

    this.isFamiliesLoading = true;
    this.http.delete(`${this.apiBase}/account/admin/families/${familyId}/members/${currentUser.id}`)
      .pipe(
        finalize(() => {
          this.isFamiliesLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.message.success(this.i18n.translate('momApp.admin.users.detailModal.deleteSuccess'));
          // Reload all data because family and baby relationships changed
          this.loadAllData();
        },
        error: (err) => {
          console.error('Error removing member:', err);
          this.message.error(this.i18n.translate('momApp.admin.families.messages.removeMemberFailed') || 'Thao tác thất bại');
        }
      });
  }

  // Inline Baby Editing Actions
  startEditBaby(baby: Baby): void {
    baby.isEditing = true;
    baby.editData = {
      name: baby.name,
      birthDate: new Date(baby.birthDate),
      gender: baby.gender,
      weightKg: baby.weightKg,
      heightCm: baby.heightCm
    };
  }

  cancelEditBaby(baby: Baby): void {
    baby.isEditing = false;
    baby.editData = undefined;
  }

  saveBabyDetails(baby: Baby): void {
    if (!baby.editData || !baby.editData.name.trim()) {
      this.message.warning('Vui lòng nhập tên bé.');
      return;
    }

    const normalizedWeight = this.parseOptionalNumber(baby.editData.weightKg);
    const normalizedHeight = this.parseOptionalNumber(baby.editData.heightCm);

    if (normalizedWeight === undefined) {
      this.message.warning('Cân nặng không hợp lệ.');
      return;
    }
    if (normalizedHeight === undefined) {
      this.message.warning('Chiều cao không hợp lệ.');
      return;
    }

    const birthDateStr = baby.editData.birthDate.toISOString().split('T')[0];
    const updatePayload = {
      name: baby.editData.name,
      birthDate: birthDateStr,
      gender: baby.editData.gender
    };

    const shouldCreateGrowthRecord = normalizedWeight !== null || normalizedHeight !== null;
    const growthPayload = {
      measuredAt: birthDateStr,
      weightKg: normalizedWeight,
      heightCm: normalizedHeight,
      headCircumferenceCm: null,
      notes: null
    };

    this.isBabiesLoading = true;
    this.http.put(`${this.apiBase}/baby/babies/${baby.id}`, updatePayload)
      .pipe(
        switchMap(() => {
          if (!shouldCreateGrowthRecord) {
            return of(null);
          }
          return this.http.post(`${this.apiBase}/baby/babies/${baby.id}/growth-records`, growthPayload);
        }),
        finalize(() => {
          this.isBabiesLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.message.success(this.i18n.translate('momApp.admin.users.detailModal.saveSuccess'));
          baby.isEditing = false;
          // Reload babies for consistent state
          this.loadBabiesForFamilies();
        },
        error: (err) => {
          console.error('Error updating baby:', err);
          this.message.error(this.i18n.translate('momApp.baby.messages.createLogFailed') || 'Không thể cập nhật thông tin bé');
        }
      });
  }

  // Action: Delete Baby
  deleteBaby(babyId: number): void {
    this.isBabiesLoading = true;
    this.http.delete(`${this.apiBase}/baby/babies/${babyId}`)
      .pipe(
        finalize(() => {
          this.isBabiesLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.message.success(this.i18n.translate('momApp.admin.users.detailModal.deleteSuccess'));
          // Reload babies
          this.loadBabiesForFamilies();
        },
        error: (err) => {
          console.error('Error deleting baby:', err);
          this.message.error('Không thể xóa em bé.');
        }
      });
  }

  // Utility to generate Initials for avatar fallback
  avatarUrlOf(user: AdminUser | null): string | undefined {
    if (!user?.avatarUrl) {
      return undefined;
    }

    const raw = user.avatarUrl.trim();
    if (!raw) {
      return undefined;
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }
    if (raw.startsWith('/auth/')) {
      return `${this.apiBase}${raw}`;
    }
    if (raw.startsWith('/account/')) {
      return `${this.apiBase}/auth${raw}`;
    }
    return `${this.apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }

  // Utility to generate Initials for avatar fallback
  userInitialsOf(name: string | undefined): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  closeModal(): void {
    this.modalRef.close();
  }

  // Custom formatted date
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  }

  // Get localized Role Type string
  getRoleTypeLabel(roleType: string): string {
    const key = `momApp.admin.users.role.${(roleType || 'USER').toUpperCase()}`;
    return this.i18n.translate(key) || roleType;
  }

  roleClassOf(roleType: string | null | undefined): 'role-user' | 'role-admin' | 'role-owner' {
    const normalized = this.normalizeRoleType(roleType);
    if (normalized === 'OWNER') {
      return 'role-owner';
    }
    if (normalized === 'ADMIN') {
      return 'role-admin';
    }
    return 'role-user';
  }

  // Get localized Family Role Type string
  getFamilyRoleLabel(role: string): string {
    const key = `momApp.admin.users.detailModal.role.${role}`;
    return this.i18n.translate(key) || role;
  }

  private getGrowthRecordsForBaby(babyId: number): Observable<GrowthRecord[]> {
    return this.http
      .get<ApiEnvelope<GrowthRecord[]> | GrowthRecord[]>(`${this.apiBase}/baby/babies/${babyId}/growth-records`)
      .pipe(
        map((response) => (Array.isArray(response) ? response : (response?.data ?? []))),
        catchError((err) => {
          console.error(`Error loading growth records for baby ${babyId}:`, err);
          return of([] as GrowthRecord[]);
        })
      );
  }

  private mergeBabyWithLatestGrowth(baby: Baby, familyId: number, records: GrowthRecord[]): Baby {
    const latestRecord = records[0];
    const latestWeight = this.toPositiveNumberOrUndefined(latestRecord?.weightKg);
    const latestHeight = this.toPositiveNumberOrUndefined(latestRecord?.heightCm);

    return {
      ...baby,
      familyId,
      weightKg: latestWeight ?? baby.weightKg,
      heightCm: latestHeight ?? baby.heightCm
    };
  }

  private toPositiveNumberOrUndefined(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return parsed;
  }

  private parseOptionalNumber(value: unknown): number | null | undefined {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return parsed;
  }

  statusClassOf(status: string | null | undefined): 'active' | 'inactive' | 'locked' {
    const normalized = this.normalizeUserStatus(status);
    if (normalized === 'ACTIVE') {
      return 'active';
    }
    if (normalized === 'LOCKED') {
      return 'locked';
    }
    return 'inactive';
  }

  statusTextOf(status: string | null | undefined): string {
    const normalized = this.normalizeUserStatus(status);
    if (normalized === 'ACTIVE') {
      return 'Hoạt động';
    }
    if (normalized === 'LOCKED') {
      return 'Đã khóa';
    }
    return 'Không hoạt động';
  }

  private normalizeUserStatus(status: string | null | undefined): UserStatus {
    const normalized = (status ?? '').trim().toUpperCase();
    if (!normalized) {
      return 'ACTIVE';
    }
    if (normalized === 'ACTIVE' || normalized === 'ACTIVATED' || normalized === 'ENABLED') {
      return 'ACTIVE';
    }
    if (normalized === 'LOCKED' || normalized === 'BLOCKED') {
      return 'LOCKED';
    }
    if (normalized === 'INACTIVE' || normalized === 'DISABLED') {
      return 'INACTIVE';
    }
    if (normalized.includes('LOCK') || normalized.includes('BLOCK')) {
      return 'LOCKED';
    }
    if (normalized.includes('ACT')) {
      return 'ACTIVE';
    }
    if (normalized.includes('INACT') || normalized.includes('DISAB')) {
      return 'INACTIVE';
    }
    return 'ACTIVE';
  }

  private normalizeRoleType(roleType: string | null | undefined): UserRoleType {
    const normalized = (roleType ?? '').trim().toUpperCase();
    if (normalized === 'ADMIN' || normalized === 'OWNER') {
      return normalized;
    }
    return 'USER';
  }
}

