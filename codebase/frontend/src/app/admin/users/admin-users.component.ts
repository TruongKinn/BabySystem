import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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

  constructor(
    private readonly http: HttpClient,
    private readonly message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    const params = new HttpParams()
      .set('page', String(Math.max(this.pageIndex - 1, 0)))
      .set('size', String(this.pageSize));

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
        this.message.error('Không thể tải danh sách user.');
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
      this.message.warning('Vui lòng nhập mật khẩu tạm.');
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
          this.message.success('Đặt lại mật khẩu thành công.');
          this.closeResetPasswordModal();
        },
        error: () => {
          this.isResetLoading = false;
          this.message.error('Không thể đặt lại mật khẩu.');
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

  private updateUserStatus(user: AdminUser, status: Extract<UserStatus, 'ACTIVE' | 'LOCKED'>): void {
    this.actionLoadingUserId = user.id;
    this.http.patch<void>(`${this.apiBase}/auth/users/${user.id}/status`, { status }).subscribe({
      next: () => {
        this.actionLoadingUserId = null;
        this.message.success(status === 'LOCKED' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
        this.loadUsers();
      },
      error: () => {
        this.actionLoadingUserId = null;
        this.message.error(status === 'LOCKED' ? 'Không thể khóa tài khoản.' : 'Không thể mở khóa tài khoản.');
      }
    });
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
