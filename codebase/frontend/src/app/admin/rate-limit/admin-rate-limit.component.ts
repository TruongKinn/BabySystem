import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface SimulationResult {
  index: number;
  status: 'pending' | 'running' | 'success' | 'limited' | 'error';
  statusCode?: number;
  latency?: number;
  time?: string;
  message?: string;
}

@Component({
  selector: 'app-admin-rate-limit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzGridModule,
    NzSliderModule,
    NzSelectModule,
    NzButtonModule,
    NzTableModule,
    NzProgressModule,
    NzBadgeModule,
    NzIconModule,
    NzToolTipModule,
    NzAlertModule
  ],
  templateUrl: './admin-rate-limit.component.html',
  styleUrl: './admin-rate-limit.component.css'
})
export class AdminRateLimitComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  // System Configuration
  replenishRate = 20;
  burstCapacity = 40;
  requestedTokens = 1;
  redisStatus = 'connected';

  // Simulator State
  requestCount = 60;
  selectedEndpoint = '/auth/captcha';
  running = false;
  progressPercent = 0;
  activeTab: 'all' | 'success' | 'limited' = 'all';
  
  endpoints = [
    { label: '/auth/captcha (Public GET)', value: '/auth/captcha', method: 'GET' },
    { label: '/auth/forgot-password (Public POST)', value: '/auth/forgot-password', method: 'POST' }
  ];

  results: SimulationResult[] = [];
  timeouts: any[] = [];
  
  // Statistical State (Animated)
  successCount = 0;
  limitedCount = 0;
  errorCount = 0;
  
  // Real-time Latency Chart Variables (SVG)
  svgWidth = 500;
  svgHeight = 100;
  latencyPath = '';
  latencyAreaPath = '';
  maxObservedLatency = 100;

  ngOnInit(): void {
    this.resetResults();
  }

  resetResults(): void {
    this.results = [];
    this.successCount = 0;
    this.limitedCount = 0;
    this.errorCount = 0;
    this.progressPercent = 0;
    this.latencyPath = '';
    this.latencyAreaPath = '';
    this.maxObservedLatency = 100;
    this.activeTab = 'all';
    this.clearTimeouts();
  }

  clearTimeouts(): void {
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
  }

  get successRate(): number {
    if (this.results.length === 0) return 0;
    const completed = this.successCount + this.limitedCount + this.errorCount;
    if (completed === 0) return 0;
    return Math.round((this.successCount / completed) * 100);
  }

  // Calculate SVG stroke dashoffset for the Donut Chart (Radius = 36, Circumference = 226)
  get donutDashOffset(): number {
    const rate = this.successRate;
    return 226 - (226 * rate) / 100;
  }

  get filteredResults(): SimulationResult[] {
    if (this.activeTab === 'success') {
      return this.results.filter(r => r.status === 'success');
    }
    if (this.activeTab === 'limited') {
      return this.results.filter(r => r.status === 'limited');
    }
    return this.results;
  }

  cancelSimulation(): void {
    if (!this.running) return;
    this.clearTimeouts();
    this.running = false;
    
    // Mark remaining pending items as error/cancelled
    this.results.forEach(r => {
      if (r.status === 'pending' || r.status === 'running') {
        r.status = 'error';
        r.message = 'Cancelled by user';
        r.statusCode = 0;
      }
    });
    this.errorCount = this.results.filter(r => r.status === 'error').length;
    this.updateCharts();
  }

  runSimulation(): void {
    if (this.running) return;
    
    this.resetResults();
    this.running = true;
    
    // Initialize results array with pending items
    for (let i = 1; i <= this.requestCount; i++) {
      this.results.push({
        index: i,
        status: 'pending'
      });
    }

    const gatewayUrl = API_CONFIG.GATEWAY_URL;
    const endpointUrl = `${gatewayUrl}${this.selectedEndpoint}`;
    const selectedItem = this.endpoints.find(e => e.value === this.selectedEndpoint);
    const method = selectedItem ? selectedItem.method : 'GET';
    
    let completedRequests = 0;

    // Send requests rapidly with stagger (6ms) to trigger token bucket limit
    for (let i = 0; i < this.requestCount; i++) {
      const timeoutId = setTimeout(() => {
        if (!this.running) return;

        // Mark request as running
        this.results[i].status = 'running';
        this.cdr.detectChanges();

        const startTime = Date.now();
        const requestTime = new Date().toLocaleTimeString();
        
        let reqObs;
        if (method === 'POST') {
          reqObs = this.http.post(endpointUrl, { email: 'test@rate-limit.local' }, { observe: 'response' });
        } else {
          reqObs = this.http.get(`${endpointUrl}?t=${startTime}_${i}`, { observe: 'response' });
        }

        reqObs.subscribe({
          next: (response) => {
            if (!this.running) return;
            const latency = Date.now() - startTime;
            this.updateRequestResult(i, 'success', response.status, latency, requestTime, 'OK');
            completedRequests++;
            this.updateProgress(completedRequests);
          },
          error: (error: HttpErrorResponse) => {
            if (!this.running) return;
            const latency = Date.now() - startTime;
            const status = error.status;
            let statusText = error.statusText || 'Error';
            let statusType: 'limited' | 'error' = 'error';
            
            if (status === 429) {
              statusType = 'limited';
              statusText = 'Too Many Requests';
            }
            
            const errMsg = error.error?.message || error.message || statusText;
            this.updateRequestResult(i, statusType, status, latency, requestTime, errMsg);
            completedRequests++;
            this.updateProgress(completedRequests);
          }
        });
      }, i * 6);
      this.timeouts.push(timeoutId);
    }
  }

  private updateRequestResult(
    index: number,
    status: 'success' | 'limited' | 'error',
    statusCode: number,
    latency: number,
    time: string,
    message: string
  ): void {
    if (this.results[index]) {
      this.results[index] = {
        index: index + 1,
        status,
        statusCode,
        latency,
        time,
        message
      };
      
      // Update counters
      this.successCount = this.results.filter(r => r.status === 'success').length;
      this.limitedCount = this.results.filter(r => r.status === 'limited').length;
      this.errorCount = this.results.filter(r => r.status === 'error').length;
      
      // Re-render SVG chart paths
      this.updateCharts();
    }
  }

  private updateCharts(): void {
    const completedItems = this.results.filter(r => r.status !== 'pending' && r.status !== 'running' && r.latency !== undefined);
    if (completedItems.length === 0) return;

    // Dynamically calculate scale factors
    const maxLat = Math.max(...completedItems.map(r => r.latency || 0));
    this.maxObservedLatency = Math.max(100, maxLat);

    const points: {x: number, y: number}[] = [];
    const count = this.results.length;
    
    this.results.forEach((res, i) => {
      if (res.status === 'pending' || res.status === 'running' || res.latency === undefined) return;
      
      // Map index to X coordinate
      const x = (i / (count - 1)) * this.svgWidth;
      // Map latency to Y coordinate
      const y = this.svgHeight - ((res.latency / this.maxObservedLatency) * (this.svgHeight - 10)) - 5;
      points.push({ x, y });
    });

    if (points.length === 0) return;

    // Draw Line Path
    let lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      lineD += ` L ${points[i].x} ${points[i].y}`;
    }
    this.latencyPath = lineD;

    // Draw Filled Area Path (closing the shape to the bottom)
    const lastPoint = points[points.length - 1];
    this.latencyAreaPath = `${lineD} L ${lastPoint.x} ${this.svgHeight} L ${points[0].x} ${this.svgHeight} Z`;
    
    this.cdr.detectChanges();
  }

  private updateProgress(completed: number): void {
    this.progressPercent = Math.round((completed / this.requestCount) * 100);
    if (completed === this.requestCount) {
      this.running = false;
      this.clearTimeouts();
    }
    this.cdr.detectChanges();
  }
}
