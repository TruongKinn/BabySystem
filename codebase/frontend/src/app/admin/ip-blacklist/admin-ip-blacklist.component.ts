import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzMessageService } from 'ng-zorro-antd/message';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface BlockedIp {
  ip: string;
  reason: string;
  blockedAt: string;
  expiryTime?: string;
  ttl: number; // in seconds
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Component({
  selector: 'app-admin-ip-blacklist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzGridModule,
    NzTableModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzAlertModule
  ],
  templateUrl: './admin-ip-blacklist.component.html',
  styleUrl: './admin-ip-blacklist.component.css'
})
export class AdminIpBlacklistComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);

  // Form State
  ipInput = '';
  reasonInput = '';
  durationInput = 3600; // default 1 hour in seconds
  submitting = false;

  // List State
  blockedIps: BlockedIp[] = [];
  loading = false;
  unblockingIp: string | null = null;

  // Simulator State
  simIp = '';
  simEndpoint = '/auth/captcha';
  simRunning = false;
  simResult: {
    status: number;
    statusText: string;
    latency: number;
    message: string;
    timestamp: string;
    success: boolean;
  } | null = null;

  endpoints = [
    { label: '/auth/captcha (Public GET)', value: '/auth/captcha', method: 'GET' },
    { label: '/auth/forgot-password (Public POST)', value: '/auth/forgot-password', method: 'POST' }
  ];

  // Duration options in seconds
  durationOptions = [
    { labelKey: 'admin.ip-blacklist.duration1h', value: 3600 },
    { labelKey: 'admin.ip-blacklist.duration6h', value: 21600 },
    { labelKey: 'admin.ip-blacklist.duration24h', value: 86400 },
    { labelKey: 'admin.ip-blacklist.durationPermanent', value: 0 } // 0 means permanent
  ];

  ngOnInit(): void {
    this.loadBlockedIps();
  }

  loadBlockedIps(): void {
    this.loading = true;
    const url = `${API_CONFIG.GATEWAY_URL}/auth/admin/ip-blacklist`;
    
    this.http.get<ApiEnvelope<BlockedIp[]>>(url).subscribe({
      next: (res) => {
        this.blockedIps = res.data || [];
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.message.error(err.error?.message || 'Failed to load blocked IPs');
        this.loading = false;
      }
    });
  }

  validateIp(ip: string): boolean {
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Pattern = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
    return ipv4Pattern.test(ip.trim()) || ipv6Pattern.test(ip.trim());
  }

  blockIp(): void {
    const trimmedIp = this.ipInput.trim();
    if (!trimmedIp) return;

    if (!this.validateIp(trimmedIp)) {
      this.message.error(this.i18n.translate('admin.ip-blacklist.invalidIp'));
      return;
    }

    this.submitting = true;
    const url = `${API_CONFIG.GATEWAY_URL}/auth/admin/ip-blacklist`;
    const payload = {
      ip: trimmedIp,
      reason: this.reasonInput.trim() || 'Blocked by administrator',
      durationSeconds: this.durationInput
    };

    this.http.post<ApiEnvelope<any>>(url, payload).subscribe({
      next: () => {
        this.message.success(this.i18n.translate('admin.ip-blacklist.blockSuccess'));
        // Autofill simulator with blocked IP for convenience
        this.simIp = trimmedIp;
        this.ipInput = '';
        this.reasonInput = '';
        this.submitting = false;
        this.loadBlockedIps();
      },
      error: (err: HttpErrorResponse) => {
        this.message.error(err.error?.message || 'Failed to block IP');
        this.submitting = false;
      }
    });
  }

  unblockIp(ip: string): void {
    this.unblockingIp = ip;
    const url = `${API_CONFIG.GATEWAY_URL}/auth/admin/ip-blacklist/${ip}`;

    this.http.delete<ApiEnvelope<any>>(url).subscribe({
      next: () => {
        this.message.success(this.i18n.translate('admin.ip-blacklist.unblockSuccess'));
        this.unblockingIp = null;
        this.loadBlockedIps();
      },
      error: (err: HttpErrorResponse) => {
        this.message.error(err.error?.message || 'Failed to unblock IP');
        this.unblockingIp = null;
      }
    });
  }

  runIpSimulation(): void {
    const trimmedIp = this.simIp.trim();
    if (!trimmedIp) return;

    if (!this.validateIp(trimmedIp)) {
      this.message.error(this.i18n.translate('admin.ip-blacklist.invalidIp'));
      return;
    }

    this.simRunning = true;
    this.simResult = null;
    
    const gatewayUrl = API_CONFIG.GATEWAY_URL;
    const url = `${gatewayUrl}${this.simEndpoint}`;
    const selectedItem = this.endpoints.find(e => e.value === this.simEndpoint);
    const method = selectedItem ? selectedItem.method : 'GET';
    const startTime = Date.now();

    const headers = { 'X-Forwarded-For': trimmedIp };
    let reqObs;
    if (method === 'POST') {
      reqObs = this.http.post(url, { email: 'sim-test@ip-block.local' }, { headers, observe: 'response' });
    } else {
      reqObs = this.http.get(`${url}?t=${startTime}`, { headers, observe: 'response' });
    }

    reqObs.subscribe({
      next: (response) => {
        const latency = Date.now() - startTime;
        this.simResult = {
          status: response.status,
          statusText: 'OK',
          latency,
          message: 'Allowed - Access Granted',
          timestamp: new Date().toLocaleTimeString(),
          success: true
        };
        this.simRunning = false;
      },
      error: (error: HttpErrorResponse) => {
        const latency = Date.now() - startTime;
        const isBlocked = error.status === 403;
        
        let displayMsg = error.error?.message || error.message || 'Error occurred';
        if (isBlocked) {
          displayMsg = error.error?.message || 'Access Denied: IP blocked by gateway rules.';
        }

        this.simResult = {
          status: error.status,
          statusText: error.status === 403 ? 'Forbidden' : (error.statusText || 'Error'),
          latency,
          message: displayMsg,
          timestamp: new Date().toLocaleTimeString(),
          success: !isBlocked && error.status >= 200 && error.status < 300
        };
        this.simRunning = false;
      }
    });
  }

  formatTtl(ttl: number): string {
    if (ttl <= 0) {
      return this.i18n.translate('admin.ip-blacklist.permanent');
    }
    
    const hours = Math.floor(ttl / 3600);
    const minutes = Math.floor((ttl % 3600) / 60);
    const seconds = ttl % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }
}
