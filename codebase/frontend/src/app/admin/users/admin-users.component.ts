import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  type?: string;
  status: UserStatus;
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
    NzTagModule
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);

  readonly apiBase = API_CONFIG.GATEWAY_URL;

  loading = false;
  actionLoadingUserId: number | null = null;
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];

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
    return this.filteredUsers.filter((item) => item.status === 'LOCKED').length;
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

  fullNameOf(user: AdminUser): string {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || '-';
  }

  statusColorOf(status: UserStatus): string {
    if (status === 'ACTIVE') {
      return 'green';
    }
    if (status === 'LOCKED') {
      return 'red';
    }
    return 'gold';
  }

  statusClassOf(status: UserStatus): string {
    if (status === 'ACTIVE') {
      return 'status-active';
    }
    if (status === 'LOCKED') {
      return 'status-locked';
    }
    return 'status-inactive';
  }

  statusLabel(status: UserStatus): string {
    return this.i18n.translate(`momApp.admin.users.status.${status}`);
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
