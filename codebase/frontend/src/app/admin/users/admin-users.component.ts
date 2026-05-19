import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';
import { SuperAppCommandService } from '../../core/services/super-app-command.service';
import { AuthService } from '../../auth/auth.service';
import { AdminUserDetailModalComponent } from './detail-modal/admin-user-detail-modal.component';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';
type UserType = 'USER' | 'ADMIN' | 'OWNER';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  type?: string;
  status: string;
  avatarUrl?: string;
  createdAt?: string;
  lastLogin?: string;
  gender?: string;
}

interface UserPageResponse {
  page: number;
  size: number;
  total: number;
  items: AdminUser[];
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzTableModule,
    NzTagModule,
    NzAvatarModule,
    NzIconModule,
    NzToolTipModule
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);
  private readonly command = inject(SuperAppCommandService);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(NzModalService);

  readonly apiBase = API_CONFIG.GATEWAY_URL;

  loading = false;
  actionLoadingUserId: number | null = null;
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  avatarVersions: { [key: number]: number } = {};

  pageIndex = 1;
  pageSize = 10;
  total = 0;

  searchText = '';

  isResetModalVisible = false;
  resetTargetUser: AdminUser | null = null;
  temporaryPassword = '';
  isResetLoading = false;

  ngOnInit(): void {
    this.loadUsers();
  }

  get lockedOnPage(): number {
    return this.filteredUsers.filter((item) => this.normalizeUserStatus(item.status) === 'LOCKED').length;
  }

  get adminOnPage(): number {
    return this.filteredUsers.filter((item) => this.isAdminType(item.type)).length;
  }

  loadUsers(): void {
    this.loading = true;
    const params = new HttpParams().set('page', String(Math.max(this.pageIndex - 1, 0))).set('size', String(this.pageSize));

    this.http.get<UserPageResponse>(`${this.apiBase}/auth/account/user/list`, { params }).subscribe({
      next: (response) => {
        this.loading = false;
        this.users = response.items ?? [];
        this.total = response.total ?? this.users.length;
        this.applySearch();
      },
      error: () => {
        this.loading = false;
        this.users = [];
        this.filteredUsers = [];
        this.total = 0;
        this.message.error(this.i18n.translate('momApp.admin.users.messages.loadFailed'));
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.applySearch();
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadUsers();
  }

  lockUser(user: AdminUser): void {
    this.updateUserStatus(user, 'LOCKED');
  }

  unlockUser(user: AdminUser): void {
    this.updateUserStatus(user, 'ACTIVE');
  }

  promoteToAdmin(user: AdminUser): void {
    if (!this.canPromoteToAdmin(user)) {
      this.message.warning(this.i18n.translate('momApp.admin.users.messages.promoteLocked'));
      return;
    }
    this.updateUserType(user, 'ADMIN');
  }

  demoteToUser(user: AdminUser): void {
    this.updateUserType(user, 'USER');
  }

  canPromoteToAdmin(user: AdminUser): boolean {
    return this.normalizeUserType(user.type) === 'USER' && this.normalizeUserStatus(user.status) !== 'LOCKED';
  }

  canDemoteToUser(user: AdminUser): boolean {
    return this.normalizeUserType(user.type) === 'ADMIN';
  }

  canLockUser(user: AdminUser): boolean {
    return this.normalizeUserStatus(user.status) !== 'LOCKED';
  }

  canUnlockUser(user: AdminUser): boolean {
    return this.normalizeUserStatus(user.status) === 'LOCKED';
  }

  openResetPasswordModal(user: AdminUser): void {
    this.resetTargetUser = user;
    this.temporaryPassword = '';
    this.isResetModalVisible = true;
  }

  closeResetPasswordModal(): void {
    this.isResetModalVisible = false;
    this.resetTargetUser = null;
    this.temporaryPassword = '';
  }

  confirmResetPassword(): void {
    if (!this.resetTargetUser) {
      return;
    }

    const password = this.temporaryPassword.trim();
    if (!password) {
      this.message.warning(this.i18n.translate('momApp.admin.users.messages.passwordRequired'));
      return;
    }

    this.isResetLoading = true;
    this.http
      .post<void>(`${this.apiBase}/auth/users/${this.resetTargetUser.id}/reset-password`, {
        temporaryPassword: password
      })
      .subscribe({
        next: () => {
          this.isResetLoading = false;
          this.message.success(this.i18n.translate('momApp.admin.users.messages.resetSuccess'));
          this.closeResetPasswordModal();
        },
        error: () => {
          this.isResetLoading = false;
          this.message.error(this.i18n.translate('momApp.admin.users.messages.resetFailed'));
        }
      });
  }

  openUserDetailModal(user: AdminUser): void {
    const modalUser = {
      id: user.id,
      username: user.username,
      fullName: this.fullNameOf(user),
      email: user.email,
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
      roleType: (user.type || 'USER') as any,
      status: (user.status || 'ACTIVE') as any,
      createdAt: (user as any).createdAt || '',
      lastLogin: (user as any).lastLogin || '',
      gender: (user as any).gender || '',
      dateOfBirth: user.dateOfBirth || ''
    };

    const modal = this.modalService.create({
      nzTitle: undefined,
      nzContent: AdminUserDetailModalComponent,
      nzData: { user: modalUser },
      nzClassName: 'admin-role-modal',
      nzClosable: false,
      nzFooter: null,
      nzWidth: '90vw',
      nzStyle: { maxWidth: '1300px', top: '20px' },
      nzMaskClosable: true
    });

    modal.afterClose.subscribe(() => {
      this.loadUsers();
    });
  }

  fullNameOf(user: AdminUser): string {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || '-';
  }

  avatarUrlOf(user: AdminUser): string | undefined {
    if (!user.avatarUrl) {
      return undefined;
    }
    const raw = user.avatarUrl.trim();
    let resolved = '';
    if (/^https?:\/\//i.test(raw)) {
      resolved = raw;
    } else if (raw.startsWith('/auth/')) {
      resolved = `${this.apiBase}${raw}`;
    } else if (raw.startsWith('/account/')) {
      resolved = `${this.apiBase}/auth${raw}`;
    } else {
      resolved = `${this.apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
    }
    const version = this.avatarVersions[user.id] || 0;
    return `${resolved}${resolved.includes('?') ? '&' : '?'}v=${version}`;
  }

  userInitialsOf(user: AdminUser): string {
    const fn = user.firstName?.trim() || '';
    const ln = user.lastName?.trim() || '';
    if (!fn && !ln) {
      return user.username?.substring(0, 2).toUpperCase() || 'U';
    }
    const firstChar = fn ? fn.charAt(0) : '';
    const lastChar = ln ? ln.charAt(0) : '';
    return (firstChar + lastChar).toUpperCase();
  }

  onAvatarFileSelected(event: Event, user: AdminUser): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.message.error(this.i18n.translate('momApp.profile.messages.selectImageOnly'));
      return;
    }

    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      this.message.error(this.i18n.translate('momApp.profile.messages.fileTooLarge'));
      return;
    }

    this.actionLoadingUserId = user.id;
    this.command.uploadUserAvatar(user.id, file).subscribe({
      next: (avatarUrl) => {
        this.actionLoadingUserId = null;
        this.avatarVersions[user.id] = Date.now();
        
        // Cập nhật ngay lập tức ở local
        user.avatarUrl = avatarUrl;

        // Đồng bộ hóa ảnh đại diện mới vào phiên làm việc hiện tại của Admin nếu họ tự up ảnh cho chính mình
        const currentUserId = this.command.getUserId();
        if (currentUserId === user.id) {
          this.authService.setAvatarUrl(avatarUrl || null);
        }

        this.message.success(this.i18n.translate('momApp.profile.messages.uploadSuccess'));
        this.loadUsers();
      },
      error: (err) => {
        this.actionLoadingUserId = null;
        this.message.error(this.i18n.translate('momApp.profile.messages.uploadFailed'));
        console.error('Avatar upload error:', err);
      }
    });
  }


  statusClassOf(status: string): string {
    const normalized = this.normalizeUserStatus(status);
    if (normalized === 'ACTIVE') {
      return 'status-active';
    }
    if (normalized === 'LOCKED') {
      return 'status-locked';
    }
    return 'status-inactive';
  }

  statusLabel(status: string): string {
    const normalized = this.normalizeUserStatus(status).toLowerCase();
    return this.i18n.translate(`momApp.admin.users.status.${normalized}`);
  }

  roleLabel(type?: string): string {
    const normalized = (type ?? 'USER').toUpperCase();
    if (normalized === 'OWNER') {
      return this.i18n.translate('momApp.admin.users.role.OWNER');
    }
    if (normalized === 'ADMIN') {
      return this.i18n.translate('momApp.admin.users.role.ADMIN');
    }
    return this.i18n.translate('momApp.admin.users.role.USER');
  }

  roleClassOf(type?: string): string {
    const normalized = this.normalizeUserType(type);
    if (normalized === 'OWNER') {
      return 'role-owner';
    }
    if (normalized === 'ADMIN') {
      return 'role-admin';
    }
    return 'role-user';
  }

  trackByUser(_: number, user: AdminUser): number {
    return user.id;
  }

  private updateUserStatus(user: AdminUser, status: Extract<UserStatus, 'ACTIVE' | 'LOCKED'>): void {
    this.actionLoadingUserId = user.id;
    this.http.patch<void>(`${this.apiBase}/auth/users/${user.id}/status`, { status }).subscribe({
      next: () => {
        this.actionLoadingUserId = null;
        this.message.success(
          this.i18n.translate(status === 'LOCKED' ? 'momApp.admin.users.messages.lockSuccess' : 'momApp.admin.users.messages.unlockSuccess')
        );
        this.loadUsers();
      },
      error: () => {
        this.actionLoadingUserId = null;
        this.message.error(
          this.i18n.translate(status === 'LOCKED' ? 'momApp.admin.users.messages.lockFailed' : 'momApp.admin.users.messages.unlockFailed')
        );
      }
    });
  }

  private isAdminType(type?: string): boolean {
    const normalized = (type ?? '').toUpperCase();
    return normalized === 'ADMIN' || normalized === 'OWNER';
  }

  private normalizeUserType(type: string | null | undefined): UserType {
    const normalized = (type ?? '').trim().toUpperCase();
    if (normalized === 'ADMIN' || normalized === 'OWNER') {
      return normalized;
    }
    return 'USER';
  }

  private updateUserType(user: AdminUser, type: Extract<UserType, 'USER' | 'ADMIN'>): void {
    const currentType = this.normalizeUserType(user.type);
    if (currentType === type) {
      return;
    }

    this.actionLoadingUserId = user.id;
    this.http.patch<void>(`${this.apiBase}/auth/users/${user.id}/type`, { type }).subscribe({
      next: () => {
        this.actionLoadingUserId = null;
        this.message.success(
          this.i18n.translate(
            type === 'ADMIN'
              ? 'momApp.admin.users.messages.promoteSuccess'
              : 'momApp.admin.users.messages.demoteSuccess'
          )
        );
        this.loadUsers();
      },
      error: () => {
        this.actionLoadingUserId = null;
        this.message.error(
          this.i18n.translate(
            type === 'ADMIN'
              ? 'momApp.admin.users.messages.promoteFailed'
              : 'momApp.admin.users.messages.demoteFailed'
          )
        );
      }
    });
  }

  private normalizeUserStatus(status: string | null | undefined): UserStatus {
    const normalized = (status ?? '').trim().toUpperCase();
    if (normalized === 'ACTIVE' || normalized === 'INACTIVE' || normalized === 'LOCKED') {
      return normalized;
    }
    return 'INACTIVE';
  }

  private applySearch(): void {
    const keyword = this.searchText.trim().toLowerCase();
    if (!keyword) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filteredUsers = this.users.filter((user) => {
      const haystacks = [
        user.username,
        user.email,
        user.firstName,
        user.lastName,
        user.phone ?? '',
        user.type ?? '',
        user.status ?? ''
      ];
      return haystacks.some((value) => value?.toLowerCase().includes(keyword));
    });
  }
}
