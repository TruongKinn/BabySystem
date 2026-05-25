import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ExportPasswordRecord {
  id: number;
  familyId: number;
  reportMonth: string;
  fileName: string;
  passwordMasked: string;
  passwordRaw?: string;
  passwordAlgorithm: string;
  fileSizeBytes: number;
  exportedByUserId?: number | null;
  createdAt: string;
  // UI states
  showPassword?: boolean;
}

interface ExportPasswordPageResponse {
  page: number;
  size: number;
  total: number;
  items: ExportPasswordRecord[];
}

interface AdminUser {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface UserPageResponse {
  page: number;
  size: number;
  total: number;
  items: AdminUser[];
}

@Component({
  selector: 'app-admin-export-passwords',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule
  ],
  templateUrl: './admin-export-passwords.component.html',
  styleUrl: './admin-export-passwords.component.css'
})
export class AdminExportPasswordsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly i18n = inject(I18nService);

  readonly apiBase = API_CONFIG.GATEWAY_URL;

  loading = false;
  loadingUsers = false;
  deletingRecordId: number | null = null;
  sendingNotificationId: number | null = null;

  records: ExportPasswordRecord[] = [];
  users: AdminUser[] = [];
  userLookup = new Map<number, AdminUser>();

  selectedUserId: number | null = null;
  familyIdFilter = '';
  monthFilter = '';

  pageIndex = 1;
  pageSize = 12;
  total = 0;

  // Notification send modal state
  notifyModalVisible = false;
  notifyRecord: ExportPasswordRecord | null = null;
  notifyTitle = '';
  notifyMessage = '';
  sendingNotify = false;

  ngOnInit(): void {
    this.loadUsersLookup();
    this.loadRecords();
  }

  get visibleRecordCount(): number {
    return this.records.length;
  }

  get totalFileSizeOnPage(): string {
    const totalBytes = this.records.reduce((sum, item) => sum + (item.fileSizeBytes || 0), 0);
    return this.formatBytes(totalBytes);
  }

  get selectedUserLabel(): string {
    if (!this.selectedUserId) {
      return this.i18n.translate('momApp.admin.exportPasswords.stats.allUsers');
    }
    return this.userLabel(this.selectedUserId);
  }

  loadRecords(): void {
    this.loading = true;
    this.http
      .get<ApiEnvelope<ExportPasswordPageResponse>>(`${this.apiBase}/insight/admin/export-passwords`, {
        params: this.buildQueryParams()
      })
      .subscribe({
        next: (response) => {
          const page = response.data;
          this.records = page?.items ?? [];
          this.total = page?.total ?? this.records.length;
          this.loading = false;
        },
        error: () => {
          this.records = [];
          this.total = 0;
          this.loading = false;
          this.message.error(this.i18n.translate('momApp.admin.exportPasswords.messages.loadFailed'));
        }
      });
  }

  loadUsersLookup(): void {
    this.loadingUsers = true;
    const params = new HttpParams().set('page', '0').set('size', '500');

    this.http.get<UserPageResponse>(`${this.apiBase}/auth/account/user/list`, { params }).subscribe({
      next: (response) => {
        this.users = response.items ?? [];
        this.userLookup = new Map(this.users.map((user) => [user.id, user]));
        this.loadingUsers = false;
      },
      error: () => {
        this.users = [];
        this.userLookup.clear();
        this.loadingUsers = false;
      }
    });
  }

  applyFilters(): void {
    this.pageIndex = 1;
    this.loadRecords();
  }

  resetFilters(): void {
    this.selectedUserId = null;
    this.familyIdFilter = '';
    this.monthFilter = '';
    this.pageIndex = 1;
    this.loadRecords();
  }

  onPageIndexChange(page: number): void {
    this.pageIndex = page;
    this.loadRecords();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadRecords();
  }

  deleteRecord(record: ExportPasswordRecord): void {
    this.deletingRecordId = record.id;
    this.http.delete<ApiEnvelope<void>>(`${this.apiBase}/insight/admin/export-passwords/${record.id}`).subscribe({
      next: () => {
        this.deletingRecordId = null;
        this.message.success(this.i18n.translate('momApp.admin.exportPasswords.messages.deleteSuccess'));
        this.loadRecords();
      },
      error: () => {
        this.deletingRecordId = null;
        this.message.error(this.i18n.translate('momApp.admin.exportPasswords.messages.deleteFailed'));
      }
    });
  }

  userLabel(userId: number | null | undefined): string {
    if (!userId) {
      return '-';
    }

    const user = this.userLookup.get(userId);
    if (!user) {
      return `User #${userId}`;
    }

    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName ? `${fullName} (@${user.username})` : `@${user.username}`;
  }

  formatBytes(bytes: number | null | undefined): string {
    const value = bytes ?? 0;
    if (value <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const size = value / Math.pow(1024, index);
    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  trackByRecord(_: number, record: ExportPasswordRecord): number {
    return record.id;
  }

  openNotifyModal(record: ExportPasswordRecord): void {
    this.notifyRecord = record;
    const userLabel = this.userLabel(record.exportedByUserId);
    this.notifyTitle = `Thông tin mật khẩu file báo cáo tháng ${record.reportMonth}`;
    this.notifyMessage = `Xin chào ${userLabel},\n\nFile báo cáo "${record.fileName}" tháng ${record.reportMonth} đã được xuất.\n\nMật khẩu mở file: ${record.passwordRaw || record.passwordMasked}\n\nVui lòng giữ bí mật thông tin này.`;
    this.notifyModalVisible = true;
  }

  closeNotifyModal(): void {
    this.notifyModalVisible = false;
    this.notifyRecord = null;
    this.notifyTitle = '';
    this.notifyMessage = '';
  }

  sendPasswordNotification(): void {
    if (!this.notifyRecord || !this.notifyTitle.trim() || !this.notifyMessage.trim()) {
      return;
    }

    const record = this.notifyRecord;
    const userId = record.exportedByUserId;

    if (!userId) {
      this.message.warning('Record này không có thông tin user để gửi thông báo.');
      return;
    }

    this.sendingNotify = true;
    this.sendingNotificationId = record.id;

    const body = {
      familyId: record.familyId,
      userId: userId,
      channel: 'PUSH',
      type: 'INFO',
      title: this.notifyTitle.trim(),
      message: this.notifyMessage.trim()
    };

    this.http
      .post<ApiEnvelope<unknown>>(`${this.apiBase}/notification/api/notifications`, body)
      .subscribe({
        next: () => {
          this.sendingNotify = false;
          this.sendingNotificationId = null;
          this.notifyModalVisible = false;
          this.notifyRecord = null;
          this.message.success(`Đã gửi thông báo mật khẩu tới ${this.userLabel(userId)} thành công!`);
        },
        error: () => {
          this.sendingNotify = false;
          this.sendingNotificationId = null;
          this.message.error('Gửi thông báo thất bại. Vui lòng thử lại.');
        }
      });
  }

  private buildQueryParams(): HttpParams {
    let params = new HttpParams()
      .set('page', String(Math.max(this.pageIndex - 1, 0)))
      .set('size', String(this.pageSize));

    if (this.selectedUserId) {
      params = params.set('userId', String(this.selectedUserId));
    }

    const familyId = String(this.familyIdFilter ?? '').trim();
    if (familyId) {
      params = params.set('familyId', familyId);
    }

    const month = String(this.monthFilter ?? '').trim();
    if (month) {
      params = params.set('month', month);
    }

    return params;
  }
}
