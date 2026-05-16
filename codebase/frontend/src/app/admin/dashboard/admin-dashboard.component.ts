import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface AdminUser {
  id: number;
  type?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
}

interface UserPageResponse {
  items: AdminUser[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AdminFamily {
  id: number;
}

interface MetricCard {
  key: string;
  labelKey: string;
  value: number;
  descriptionKey: string;
  tone: 'cyan' | 'blue' | 'emerald' | 'amber' | 'slate';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, NzButtonModule, NzCardModule],
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

  loadSummary(): void {
    this.loading = true;
    const params = new HttpParams().set('page', '0').set('size', '500');

    forkJoin({
      users: this.http.get<UserPageResponse>(`${API_CONFIG.GATEWAY_URL}/auth/account/user/list`, { params }),
      families: this.http.get<ApiEnvelope<AdminFamily[]>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`)
    }).subscribe({
      next: ({ users: userResponse, families: familyResponse }) => {
        const users = userResponse.items ?? [];
        const families = familyResponse.data ?? [];

        this.totalUsers = users.length;
        this.activeUsers = users.filter((item) => item.status === 'ACTIVE').length;
        this.lockedUsers = users.filter((item) => item.status === 'LOCKED').length;
        this.adminUsers = users.filter((item) => (item.type ?? '').toUpperCase() !== 'USER').length;
        this.totalFamilies = families.length;
        this.lastUpdatedAt = this.formatTimestamp(new Date());
        this.loading = false;
      },
      error: () => {
        this.totalUsers = 0;
        this.activeUsers = 0;
        this.lockedUsers = 0;
        this.adminUsers = 0;
        this.totalFamilies = 0;
        this.lastUpdatedAt = this.formatTimestamp(new Date());
        this.loading = false;
      }
    });
  }

  trackByMetric(_: number, item: MetricCard): string {
    return item.key;
  }

  private formatTimestamp(value: Date): string {
    const locale = this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
    return value.toLocaleString(locale);
  }
}
