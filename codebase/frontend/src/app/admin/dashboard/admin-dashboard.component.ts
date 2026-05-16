import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NzButtonModule, NzCardModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  totalUsers = 0;
  activeUsers = 0;
  lockedUsers = 0;
  adminUsers = 0;

  loading = false;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    const params = new HttpParams().set('page', '0').set('size', '500');

    this.http.get<UserPageResponse>(`${API_CONFIG.GATEWAY_URL}/auth/account/user/list`, { params }).subscribe({
      next: (response) => {
        const users = response.items ?? [];
        this.totalUsers = users.length;
        this.activeUsers = users.filter((item) => item.status === 'ACTIVE').length;
        this.lockedUsers = users.filter((item) => item.status === 'LOCKED').length;
        this.adminUsers = users.filter((item) => (item.type ?? '').toUpperCase() !== 'USER').length;
        this.loading = false;
      },
      error: () => {
        this.totalUsers = 0;
        this.activeUsers = 0;
        this.lockedUsers = 0;
        this.adminUsers = 0;
        this.loading = false;
      }
    });
  }
}
