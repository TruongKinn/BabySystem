import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { startWith, catchError } from 'rxjs/operators';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of } from 'rxjs';
import { API_CONFIG } from '../../constants/api.constant';
import { NotificationWebsocketService } from '../../../core/services/notification-websocket.service';
import { SuperAppCommandService } from '../../../core/services/super-app-command.service';
import { AuthService } from '../../../auth/auth.service';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
  type?: string;
  metadataJson?: string;
  userId?: number | null;
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
  private readonly messageService = inject(NzMessageService);
  isOpen = false;
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  isLoading = false;
  isMarkingAll = false;
  selectedNotification: NotificationItem | null = null;

  isApproving = false;
  isRejecting = false;

  private pollSub?: Subscription;
  private wsSub?: Subscription;
  private isBrowser: boolean;

  constructor(
    private readonly elRef: ElementRef,
    private readonly http: HttpClient,
    private readonly commandService: SuperAppCommandService,
    private readonly wsService: NotificationWebsocketService,
    public readonly authService: AuthService,
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
        status: notification.readAt ? 'READ' : 'UNREAD',
        createdAt: notification.createdAt ?? notification.sentAt ?? new Date().toISOString(),
        type: notification.type,
        metadataJson: notification.metadataJson,
        userId: notification.userId
      };

      // Lọc thông báo cho Admin: chỉ nhận thông báo hệ thống (userId = null) hoặc gửi riêng cho chính Admin
      if (this.authService.isAdminUser()) {
        const adminUserId = this.commandService.getUserId();
        if (newItem.userId !== null && newItem.userId !== adminUserId) {
          return; // Bỏ qua thông báo của user khác
        }
      }

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
    if (userId && !this.authService.isAdminUser()) {
      params = params.set('userId', String(userId));
    }

    this.http
      .get<ApiEnvelope<any[]>>(
        `${API_CONFIG.GATEWAY_URL}/notification/api/notifications`,
        { params }
      )
      .pipe(catchError(() => of({ success: false, message: '', data: [] as any[] })))
      .subscribe((res) => {
        const adminUserId = this.commandService.getUserId();
        const dataList = (res.data ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          status: item.readAt ? 'READ' : 'UNREAD',
          createdAt: item.createdAt ?? item.sentAt ?? item.scheduledAt ?? new Date().toISOString(),
          type: item.type,
          metadataJson: item.metadataJson,
          userId: item.userId
        }) as NotificationItem);

        // Lọc thông báo cho Admin: chỉ nhận thông báo hệ thống (userId = null) hoặc gửi riêng cho chính Admin
        if (this.authService.isAdminUser()) {
          this.notifications = dataList.filter(
            (item) => item.userId === null || item.userId === adminUserId
          );
        } else {
          this.notifications = dataList;
        }

        // Sắp xếp theo thời gian giảm dần
        this.notifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Dọn dẹp trạng thái pending premium trong localStorage nếu đã có kết quả phản hồi từ Admin
        (res.data ?? []).forEach((item) => {
          if (item.metadataJson) {
            try {
              const meta = JSON.parse(item.metadataJson);
              if (meta && (meta.requestType === 'PREMIUM_APPROVED' || meta.requestType === 'PREMIUM_REJECTED')) {
                const fid = meta.familyId;
                if (fid && typeof window !== 'undefined') {
                  window.localStorage.removeItem('premium_request_pending_' + fid);
                }
              }
            } catch (e) {
              // ignore
            }
          }
        });

        this.unreadCount = this.notifications.filter((n) => n.status === 'UNREAD').length;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  loadUnreadCount(): void {
    const familyId = this.commandService.getFamilyId();
    const userId = this.commandService.getUserId();

    // Đối với Admin, chúng ta load danh sách thông báo để tự đếm nhằm tránh lẫn thông báo chưa đọc của user khác
    if (this.authService.isAdminUser()) {
      let params = new HttpParams().set('familyId', String(familyId));
      this.http
        .get<ApiEnvelope<any[]>>(
          `${API_CONFIG.GATEWAY_URL}/notification/api/notifications`,
          { params }
        )
        .pipe(catchError(() => of({ success: false, message: '', data: [] as any[] })))
        .subscribe((res) => {
          const dataList = res.data ?? [];
          const filtered = dataList.filter(
            (item) => item.userId === null || item.userId === userId
          );
          this.unreadCount = filtered.filter((n) => !n.readAt).length;
          this.cdr.markForCheck();
        });
      return;
    }

    // Đối với User bình thường, gọi API đếm chưa đọc như cũ
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
      .post<ApiEnvelope<any>>(
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

  selectNotification(notification: NotificationItem): void {
    this.selectedNotification = notification;
    
    // Nếu chưa đọc thì đánh dấu đã đọc lên DB và giảm count ở client
    if (notification.status === 'UNREAD') {
      this.http
        .post<ApiEnvelope<any>>(
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
    
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.selectedNotification = null;
    this.cdr.markForCheck();
  }

  markAllAsRead(): void {
    const unread = this.notifications.filter((n) => n.status === 'UNREAD');
    if (unread.length === 0) return;

    this.isMarkingAll = true;
    this.cdr.markForCheck();

    let completed = 0;
    unread.forEach((n) => {
      this.http
        .post<ApiEnvelope<any>>(
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

  formatFullTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const pad = (num: number) => String(num).padStart(2, '0');
    
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    
    return `${hours}:${minutes}:${seconds} ngày ${day}/${month}/${year}`;
  }

  get badgeLabel(): string {
    return this.unreadCount > 99 ? '99+' : String(this.unreadCount);
  }

  trackById(_index: number, item: NotificationItem): number {
    return item.id;
  }

  approvePremium(notification: NotificationItem, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isApproving || this.isRejecting) return;

    let meta: any = null;
    try {
      meta = notification.metadataJson ? JSON.parse(notification.metadataJson) : null;
    } catch (e) {
      this.messageService.error('Không thể parse dữ liệu yêu cầu.');
      return;
    }

    if (!meta || !meta.familyId || !meta.featureKey) {
      this.messageService.error('Dữ liệu yêu cầu không hợp lệ.');
      return;
    }

    this.isApproving = true;
    this.cdr.markForCheck();

    const payload = {
      entitlements: [
        {
          featureKey: meta.featureKey,
          status: 'ALLOW',
          expiresAt: null,
          reason: 'Approved from real-time premium request notification'
        }
      ]
    };

    this.http.put<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${meta.familyId}/entitlements`, payload)
      .pipe(
        catchError((err) => {
          this.isApproving = false;
          this.cdr.markForCheck();
          this.messageService.error(err?.error?.message || 'Không thể cấp quyền Premium.');
          return of(null);
        })
      )
      .subscribe((res) => {
        if (!res) return;

        this.commandService.createNotification({
          userId: meta.requestUserId ?? null,
          title: 'Premium Baby Journey+ đã được kích hoạt!',
          message: 'Yêu cầu mở khóa Premium của bạn đã được Admin phê duyệt. Chúc bạn có trải nghiệm tuyệt vời!',
          type: 'INFO',
          metadataJson: JSON.stringify({
            familyId: meta.familyId,
            featureKey: meta.featureKey,
            requestType: 'PREMIUM_APPROVED'
          })
        }).subscribe();

        this.http.post<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/notification/api/notifications/${notification.id}/read`, {})
          .subscribe(() => {
            notification.status = 'READ';
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.cdr.markForCheck();
          });

        this.isApproving = false;
        this.selectedNotification = null;
        this.messageService.success('Đã phê duyệt và kích hoạt Premium thành công!');
        this.loadNotifications();
        this.cdr.markForCheck();
      });
  }

  rejectPremium(notification: NotificationItem, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isApproving || this.isRejecting) return;

    let meta: any = null;
    try {
      meta = notification.metadataJson ? JSON.parse(notification.metadataJson) : null;
    } catch (e) {
      // ignore
    }

    this.isRejecting = true;
    this.cdr.markForCheck();

    if (meta && meta.requestUserId) {
      this.commandService.createNotification({
        userId: meta.requestUserId,
        title: 'Yêu cầu Premium Baby Journey+ bị từ chối',
        message: 'Rất tiếc, yêu cầu kích hoạt Premium của bạn đã bị từ chối bởi Admin.',
        type: 'INFO',
        metadataJson: JSON.stringify({
          familyId: meta.familyId,
          featureKey: meta.featureKey,
          requestType: 'PREMIUM_REJECTED'
        })
      }).subscribe();
    }

    this.http.post<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/notification/api/notifications/${notification.id}/read`, {})
      .subscribe(() => {
        notification.status = 'READ';
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.markForCheck();
      });

    this.isRejecting = false;
    this.selectedNotification = null;
    this.messageService.warning('Đã từ chối yêu cầu kích hoạt Premium.');
    this.loadNotifications();
    this.cdr.markForCheck();
  }

  isPremiumRequest(notification: NotificationItem | null): boolean {
    if (!notification || !notification.metadataJson) return false;
    try {
      const meta = JSON.parse(notification.metadataJson);
      return meta && meta.requestType === 'PREMIUM_REQUEST';
    } catch (e) {
      return false;
    }
  }
}
