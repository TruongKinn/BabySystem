import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { API_CONFIG } from '../../constants/api.constant';
import { NotificationWebsocketService } from '../../../core/services/notification-websocket.service';
import { SuperAppCommandService } from '../../../core/services/super-app-command.service';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
  type?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  isOpen = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  isLoading = false;
  isMarkingAll = false;

  private pollSub?: Subscription;
  private wsSub?: Subscription;
  private isBrowser: boolean;

  constructor(
    private readonly elRef: ElementRef,
    private readonly http: HttpClient,
    private readonly commandService: SuperAppCommandService,
    private readonly wsService: NotificationWebsocketService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Load initial notifications
    this.loadNotifications();

    // Poll every 60 seconds for new notifications
    this.pollSub = interval(60_000)
      .pipe(startWith(0))
      .subscribe(() => {
        this.loadUnreadCount();
      });

    // Listen to real-time WebSocket notifications
    this.wsSub = this.wsService.notifications$.subscribe((notification) => {
      const newItem: NotificationItem = {
        id: notification.id ?? Date.now(),
        title: notification.title ?? 'Thông báo mới',
        message: notification.message ?? '',
        status: 'UNREAD',
        createdAt: notification.createdAt ?? new Date().toISOString(),
        type: notification.type,
      };

      // Prepend to list
      this.notifications = [newItem, ...this.notifications];
      this.unreadCount = this.notifications.filter((n) => n.status === 'UNREAD').length;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.wsSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadNotifications();
    }
    this.cdr.markForCheck();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    const familyId = this.commandService.getFamilyId();
    const userId = this.commandService.getUserId();

    let params = new HttpParams().set('familyId', String(familyId));
    if (userId) {
      params = params.set('userId', String(userId));
    }

    this.http
      .get<ApiEnvelope<NotificationItem[]>>(
        `${API_CONFIG.GATEWAY_URL}/notification/api/notifications`,
        { params }
      )
      .pipe(catchError(() => of({ success: false, message: '', data: [] as NotificationItem[] })))
      .subscribe((res) => {
        this.notifications = (res.data ?? []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.unreadCount = this.notifications.filter((n) => n.status === 'UNREAD').length;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  loadUnreadCount(): void {
    const familyId = this.commandService.getFamilyId();
    const userId = this.commandService.getUserId();

    let params = new HttpParams().set('familyId', String(familyId));
    if (userId) {
      params = params.set('userId', String(userId));
    }

    this.http
      .get<ApiEnvelope<{ unreadCount: number }>>(
        `${API_CONFIG.GATEWAY_URL}/notification/api/notifications/unread/count`,
        { params }
      )
      .pipe(catchError(() => of({ success: false, message: '', data: { unreadCount: 0 } })))
      .subscribe((res) => {
        this.unreadCount = res.data?.unreadCount ?? 0;
        this.cdr.markForCheck();
      });
  }

  markAsRead(notification: NotificationItem, event: MouseEvent): void {
    event.stopPropagation();
    if (notification.status === 'READ') return;

    this.http
      .post<ApiEnvelope<NotificationItem>>(
        `${API_CONFIG.GATEWAY_URL}/notification/api/notifications/${notification.id}/read`,
        {}
      )
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        notification.status = 'READ';
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.markForCheck();
      });
  }

  markAllAsRead(): void {
    const unread = this.notifications.filter((n) => n.status === 'UNREAD');
    if (unread.length === 0) return;

    this.isMarkingAll = true;
    this.cdr.markForCheck();

    let completed = 0;
    unread.forEach((n) => {
      this.http
        .post<ApiEnvelope<NotificationItem>>(
          `${API_CONFIG.GATEWAY_URL}/notification/api/notifications/${n.id}/read`,
          {}
        )
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          n.status = 'READ';
          completed++;
          if (completed === unread.length) {
            this.unreadCount = 0;
            this.isMarkingAll = false;
            this.cdr.markForCheck();
          }
        });
    });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHr = Math.floor(diffMs / 3_600_000);
    const diffDay = Math.floor(diffMs / 86_400_000);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;

    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get badgeLabel(): string {
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
  }

  trackById(_index: number, item: NotificationItem): number {
    return item.id;
  }
}
