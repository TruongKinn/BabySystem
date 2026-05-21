import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable } from 'rxjs';
import { API_CONFIG } from '../../shared/constants/api.constant';
import { SuperAppCommandService } from './super-app-command.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationWebsocketService implements OnDestroy {
  private client: Client | null = null;
  private notificationSubject = new Subject<any>(); // Replace any with the NotificationResponse type if available
  public notifications$ = this.notificationSubject.asObservable();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private commandService: SuperAppCommandService
  ) {}

  public connect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const userId = this.commandService.getUserId();
    if (!userId) {
      return;
    }

    // Only connect if not already connected
    if (this.client && this.client.active) {
      return;
    }

    const wsUrl = `${API_CONFIG.GATEWAY_URL}/notification/ws`;
    
    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        // console.log(str);
      }
    });

    this.client.onConnect = (frame) => {
      console.log('Connected to Notification WebSocket');
      const destination = `/topic/notifications/user/${userId}`;
      this.client?.subscribe(destination, (message: IMessage) => {
        if (message.body) {
          try {
            const notification = JSON.parse(message.body);
            this.notificationSubject.next(notification);
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        }
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.activate();
  }

  public disconnect(): void {
    if (this.client && this.client.active) {
      this.client.deactivate();
      this.client = null;
      console.log('Disconnected from Notification WebSocket');
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
