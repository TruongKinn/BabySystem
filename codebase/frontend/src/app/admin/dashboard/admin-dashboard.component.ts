import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

type PermissionType = 'MENU' | 'API';

interface AdminUser {
  id: number;
  username: string;
  email?: string;
  type?: string;
  status: UserStatus;
}

interface UserPageResponse {
  items: AdminUser[];
  total?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface FamilyMemberApi {
  userId: number;
}

interface AdminFamily {
  id: number;
  name?: string;
  members: FamilyMemberApi[];
}

interface PermissionResponse {
  id: number;
  type: PermissionType;
}

interface RolePermissionResponse {
  id: number;
  name: string;
  permissionIds: number[];
}

interface RolePermissionWorkspaceResponse {
  roles: RolePermissionResponse[];
  menuPermissions: PermissionResponse[];
  apiPermissions: PermissionResponse[];
}

interface MetricCard {
  key: string;
  labelKey: string;
  value: number;
  descriptionKey: string;
  tone: 'cyan' | 'blue' | 'emerald' | 'amber' | 'slate' | 'violet' | 'teal' | 'rose';
}

interface AlertItem {
  key: string;
  level: 'danger' | 'warning' | 'info' | 'stable';
  titleKey: string;
  hintKey: string;
  value?: number;
}

interface FamilyWithCount {
  id: number;
  name: string;
  memberCount: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, NzButtonModule, NzCardModule, NzTableModule, NzTagModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  totalUsers = 0;
  activeUsers = 0;
  lockedUsers = 0;
  adminUsers = 0;
  totalFamilies = 0;
  totalRoles = 0;
  menuPermissions = 0;
  apiPermissions = 0;

  largestFamilies: FamilyWithCount[] = [];
  lockedUsersPreview: AdminUser[] = [];
  rolesWithoutPermissions = 0;

  lastUpdatedAt = '-';
  loading = false;

  ngOnInit(): void {
    this.loadSummary();
  }

  get metricCards(): MetricCard[] {
    return [
      {
        key: 'totalUsers',
        labelKey: 'momApp.admin.dashboard.metrics.totalUsers.label',
        value: this.totalUsers,
        descriptionKey: 'momApp.admin.dashboard.metrics.totalUsers.description',
        tone: 'cyan'
      },
      {
        key: 'activeUsers',
        labelKey: 'momApp.admin.dashboard.metrics.activeUsers.label',
        value: this.activeUsers,
        descriptionKey: 'momApp.admin.dashboard.metrics.activeUsers.description',
        tone: 'emerald'
      },
      {
        key: 'lockedUsers',
        labelKey: 'momApp.admin.dashboard.metrics.lockedUsers.label',
        value: this.lockedUsers,
        descriptionKey: 'momApp.admin.dashboard.metrics.lockedUsers.description',
        tone: 'amber'
      },
      {
        key: 'adminUsers',
        labelKey: 'momApp.admin.dashboard.metrics.adminUsers.label',
        value: this.adminUsers,
        descriptionKey: 'momApp.admin.dashboard.metrics.adminUsers.description',
        tone: 'blue'
      },
      {
        key: 'totalFamilies',
        labelKey: 'momApp.admin.dashboard.metrics.totalFamilies.label',
        value: this.totalFamilies,
        descriptionKey: 'momApp.admin.dashboard.metrics.totalFamilies.description',
        tone: 'slate'
      },
      {
        key: 'totalRoles',
        labelKey: 'momApp.admin.dashboard.metrics.totalRoles.label',
        value: this.totalRoles,
        descriptionKey: 'momApp.admin.dashboard.metrics.totalRoles.description',
        tone: 'violet'
      },
      {
        key: 'menuPermissions',
        labelKey: 'momApp.admin.dashboard.metrics.menuPermissions.label',
        value: this.menuPermissions,
        descriptionKey: 'momApp.admin.dashboard.metrics.menuPermissions.description',
        tone: 'teal'
      },
      {
        key: 'apiPermissions',
        labelKey: 'momApp.admin.dashboard.metrics.apiPermissions.label',
        value: this.apiPermissions,
        descriptionKey: 'momApp.admin.dashboard.metrics.apiPermissions.description',
        tone: 'rose'
      }
    ];
  }

  get lockRate(): string {
    if (!this.totalUsers) {
      return '0%';
    }
    const ratio = Math.round((this.lockedUsers / this.totalUsers) * 1000) / 10;
    return `${ratio}%`;
  }

  get activeRate(): string {
    if (!this.totalUsers) {
      return '0%';
    }
    const ratio = Math.round((this.activeUsers / this.totalUsers) * 1000) / 10;
    return `${ratio}%`;
  }

  get averageMembersPerFamily(): string {
    if (!this.totalFamilies) {
      return '0';
    }

    const totalMembers = this.largestFamilies.reduce((sum, family) => sum + family.memberCount, 0);
    const fallback = totalMembers === 0 ? 0 : totalMembers / this.largestFamilies.length;
    return fallback.toFixed(1);
  }

  get alerts(): AlertItem[] {
    const result: AlertItem[] = [];

    if (this.lockedUsers > 0) {
      result.push({
        key: 'lockedUsers',
        level: 'danger',
        titleKey: 'momApp.admin.dashboard.alerts.lockedUsers.title',
        hintKey: 'momApp.admin.dashboard.alerts.lockedUsers.hint',
        value: this.lockedUsers
      });
    }

    const inactiveUsers = Math.max(this.totalUsers - this.activeUsers, 0);
    if (inactiveUsers > 0) {
      result.push({
        key: 'inactiveUsers',
        level: 'warning',
        titleKey: 'momApp.admin.dashboard.alerts.inactiveUsers.title',
        hintKey: 'momApp.admin.dashboard.alerts.inactiveUsers.hint',
        value: inactiveUsers
      });
    }

    if (this.rolesWithoutPermissions > 0) {
      result.push({
        key: 'rolesWithoutPermissions',
        level: 'info',
        titleKey: 'momApp.admin.dashboard.alerts.rolesWithoutPermissions.title',
        hintKey: 'momApp.admin.dashboard.alerts.rolesWithoutPermissions.hint',
        value: this.rolesWithoutPermissions
      });
    }

    if (!result.length) {
      result.push({
        key: 'stable',
        level: 'stable',
        titleKey: 'momApp.admin.dashboard.alerts.stable.title',
        hintKey: 'momApp.admin.dashboard.alerts.stable.hint'
      });
    }

    return result;
  }

  loadSummary(): void {
    this.loading = true;
    const params = new HttpParams().set('page', '0').set('size', '500');

    forkJoin({
      users: this.http.get<UserPageResponse>(`${API_CONFIG.GATEWAY_URL}/auth/account/user/list`, { params }),
      families: this.http.get<ApiEnvelope<AdminFamily[]>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`),
      workspace: this.http.get<RolePermissionWorkspaceResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/workspace`)
    }).subscribe({
      next: ({ users: userResponse, families: familyResponse, workspace }) => {
        const users = userResponse.items ?? [];
        const families = familyResponse.data ?? [];
        const roles = workspace.roles ?? [];

        this.totalUsers = userResponse.total ?? users.length;
        this.activeUsers = users.filter((item) => item.status === 'ACTIVE').length;
        this.lockedUsers = users.filter((item) => item.status === 'LOCKED').length;
        this.adminUsers = users.filter((item) => (item.type ?? '').toUpperCase() !== 'USER').length;

        this.totalFamilies = families.length;
        this.totalRoles = roles.length;
        this.menuPermissions = (workspace.menuPermissions ?? []).length;
        this.apiPermissions = (workspace.apiPermissions ?? []).length;

        this.rolesWithoutPermissions = roles.filter((role) => (role.permissionIds ?? []).length === 0).length;

        this.lockedUsersPreview = users
          .filter((item) => item.status === 'LOCKED')
          .sort((left, right) => right.id - left.id)
          .slice(0, 6);

        this.largestFamilies = families
          .map((family) => ({
            id: family.id,
            name: (family.name ?? '').trim() || `#${family.id}`,
            memberCount: (family.members ?? []).length
          }))
          .sort((left, right) => {
            if (right.memberCount !== left.memberCount) {
              return right.memberCount - left.memberCount;
            }
            return left.name.localeCompare(right.name);
          })
          .slice(0, 6);

        this.lastUpdatedAt = this.formatTimestamp(new Date());
        this.loading = false;
      },
      error: () => {
        this.totalUsers = 0;
        this.activeUsers = 0;
        this.lockedUsers = 0;
        this.adminUsers = 0;
        this.totalFamilies = 0;
        this.totalRoles = 0;
        this.menuPermissions = 0;
        this.apiPermissions = 0;
        this.rolesWithoutPermissions = 0;
        this.lockedUsersPreview = [];
        this.largestFamilies = [];
        this.lastUpdatedAt = this.formatTimestamp(new Date());
        this.loading = false;
      }
    });
  }

  alertClass(level: AlertItem['level']): string {
    if (level === 'danger') {
      return 'alert-danger';
    }
    if (level === 'warning') {
      return 'alert-warning';
    }
    if (level === 'info') {
      return 'alert-info';
    }
    return 'alert-stable';
  }

  trackByMetric(_: number, item: MetricCard): string {
    return item.key;
  }

  trackByAlert(_: number, item: AlertItem): string {
    return item.key;
  }

  trackByUser(_: number, item: AdminUser): number {
    return item.id;
  }

  trackByFamily(_: number, item: FamilyWithCount): number {
    return item.id;
  }

  private formatTimestamp(value: Date): string {
    const locale = this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
    return value.toLocaleString(locale);
  }
}
