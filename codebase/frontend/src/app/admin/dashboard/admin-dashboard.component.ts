import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
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
  label: string;
  value: number;
  description: string;
  tone: 'cyan' | 'blue' | 'emerald' | 'amber' | 'slate';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NzButtonModule, NzCardModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  totalUsers = 0;
  activeUsers = 0;
  lockedUsers = 0;
  adminUsers = 0;
  totalFamilies = 0;
  lastUpdatedAt = '-';

  loading = false;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  get metricCards(): MetricCard[] {
    return [
      {
        key: 'totalUsers',
        label: 'Total users',
        value: this.totalUsers,
        description: 'All accounts in auth system',
        tone: 'cyan',
      },
      {
        key: 'activeUsers',
        label: 'Active users',
        value: this.activeUsers,
        description: 'Accounts available for sign-in',
        tone: 'emerald',
      },
      {
        key: 'lockedUsers',
        label: 'Locked users',
        value: this.lockedUsers,
        description: 'Accounts under restricted access',
        tone: 'amber',
      },
      {
        key: 'adminUsers',
        label: 'Admin accounts',
        value: this.adminUsers,
        description: 'Non-user operational accounts',
        tone: 'blue',
      },
      {
        key: 'totalFamilies',
        label: 'Family groups',
        value: this.totalFamilies,
        description: 'Family entities in account service',
        tone: 'slate',
      },
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
      families: this.http.get<ApiEnvelope<AdminFamily[]>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`),
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
      },
    });
  }

  trackByMetric(_: number, item: MetricCard): string {
    return item.key;
  }

  private formatTimestamp(value: Date): string {
    return value.toLocaleString();
  }
}
