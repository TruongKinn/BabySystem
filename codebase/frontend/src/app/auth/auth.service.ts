import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { API_CONFIG } from '../shared/constants/api.constant';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';

type AuthStorageMode = 'local' | 'session';

const AUTH_STORAGE_MODE_KEY = 'atg_auth_storage';
const AUTH_STORAGE_KEYS = [
  'atg_access_token',
  'atg_refresh_token',
  'atg_user_id',
  'atg_username',
  'atg_first_name',
  'atg_last_name',
  'atg_avatar_url'
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${API_CONFIG.GATEWAY_URL}/auth`; // API Gateway
  private isBrowser: boolean;
  public authEvents = new Subject<'login' | 'logout'>();

  constructor(
    private http: HttpClient,
    private router: Router,
    private oauthService: OAuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.oauthService.configure(authConfig); // Ensure config is loaded
  }

  getStoredItem(key: string): string | null {
    if (!this.isBrowser) {
      return null;
    }

    const preferredMode = this.resolveStorageMode();
    const storages: Storage[] = [];

    if (preferredMode) {
      storages.push(this.getStorage(preferredMode));
    }

    storages.push(localStorage, sessionStorage);

    for (const storage of storages) {
      const value = storage.getItem(key);
      if (value !== null) {
        if (key === 'atg_avatar_url') {
          return this.normalizeAvatarUrl(value);
        }
        return value;
      }
    }
    return null;
  }

  setAvatarUrl(avatarUrl: string | null): void {
    if (!this.isBrowser) {
      return;
    }

    const mode = this.resolveStorageMode() ?? 'local';
    const targetStorage = this.getStorage(mode);
    const otherStorage = this.getStorage(mode === 'local' ? 'session' : 'local');
    const normalized = this.normalizeAvatarUrl(avatarUrl);

    if (normalized) {
      targetStorage.setItem('atg_avatar_url', normalized);
    } else {
      targetStorage.removeItem('atg_avatar_url');
    }
    otherStorage.removeItem('atg_avatar_url');
    this.authEvents.next('login');
  }

  private getStorage(mode: AuthStorageMode): Storage {
    return mode === 'local' ? localStorage : sessionStorage;
  }

  private resolveStorageMode(): AuthStorageMode | null {
    if (!this.isBrowser) {
      return null;
    }

    const accessToken = localStorage.getItem('atg_access_token') ?? sessionStorage.getItem('atg_access_token');
    if (accessToken) {
      if (localStorage.getItem('atg_access_token')) {
        return 'local';
      }
      if (sessionStorage.getItem('atg_access_token')) {
        return 'session';
      }
    }

    const storedMode = localStorage.getItem(AUTH_STORAGE_MODE_KEY);
    if (storedMode === 'local' || storedMode === 'session') {
      return storedMode;
    }

    return null;
  }

  private persistAuthState(response: any, remember: boolean): void {
    if (!this.isBrowser || !response?.accessToken) {
      return;
    }

    const mode: AuthStorageMode = remember ? 'local' : 'session';
    const targetStorage = this.getStorage(mode);
    const otherStorage = this.getStorage(mode === 'local' ? 'session' : 'local');

    AUTH_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    targetStorage.setItem('atg_access_token', response.accessToken);
    if (response.refreshToken) {
      targetStorage.setItem('atg_refresh_token', response.refreshToken);
    }
    if (response.userId !== undefined && response.userId !== null) {
      targetStorage.setItem('atg_user_id', String(response.userId));
    }
    if (response.username) {
      targetStorage.setItem('atg_username', response.username);
    }
    if (response.firstName) {
      targetStorage.setItem('atg_first_name', response.firstName);
    }
    if (response.lastName) {
      targetStorage.setItem('atg_last_name', response.lastName);
    }
    const normalizedAvatarUrl = this.normalizeAvatarUrl(response.avatarUrl);
    if (normalizedAvatarUrl) {
      targetStorage.setItem('atg_avatar_url', normalizedAvatarUrl);
    }

    localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode);
    otherStorage.removeItem('atg_access_token');
    otherStorage.removeItem('atg_refresh_token');
    otherStorage.removeItem('atg_user_id');
    otherStorage.removeItem('atg_username');
    otherStorage.removeItem('atg_first_name');
    otherStorage.removeItem('atg_last_name');
    otherStorage.removeItem('atg_avatar_url');
  }

  private clearAuthState(): void {
    if (!this.isBrowser) {
      return;
    }

    AUTH_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    localStorage.removeItem(AUTH_STORAGE_MODE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_MODE_KEY);
  }


  logout(): void {
    this.logoutTo('/home');
  }

  logoutTo(redirectTo: string): void {
    if (this.isBrowser) {
      this.clearAuthState();

      if (this.oauthService.hasValidAccessToken()) {
        this.oauthService.logOut();
      }
      this.authEvents.next('logout');
    }
    this.router.navigate([redirectTo]);
  }

  login(credentials: any): Observable<any> {
    const remember = credentials?.remember !== false;
    const requestBody = { ...credentials };
    delete requestBody.remember;

    return this.http.post(`${this.apiUrl}/access-token`, requestBody).pipe(
      tap((response: any) => {
        if (this.isBrowser && response.accessToken) {
          this.persistAuthState(response, remember);
          this.authEvents.next('login');
        }
      })
    );
  }

  getCaptcha(): Observable<any> {
    return this.http.get(`${this.apiUrl}/captcha`);
  }

  refreshToken(): Observable<any> {
    const refreshToken = this.getStoredItem('atg_refresh_token');
    return this.http.post(`${this.apiUrl}/refresh-token`, {}, {
      headers: {
        'x-refresh-token': refreshToken || ''
      }
    }).pipe(
      tap((response: any) => {
        if (this.isBrowser && response.accessToken) {
          const remember = this.resolveStorageMode() !== 'session';
          this.persistAuthState(response, remember);
          this.authEvents.next('login');
        }
      })
    );
  }



  exchangeKeycloakToken(keycloakToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/exchange-keycloak-token`, {
      keycloakToken: keycloakToken,
      platform: 'web',
      deviceToken: 'web-device'
    }).pipe(
      tap((response: any) => {
        if (this.isBrowser && response.accessToken) {
          const remember = this.resolveStorageMode() !== 'session';
          this.persistAuthState(response, remember);
          this.authEvents.next('login');
        }
      })
    );
  }

  exchangeGoogleToken(idToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/exchange-google-token`, {
      idToken: idToken,
      platform: 'web',
      deviceToken: 'web-device'
    }).pipe(
      tap((response: any) => {
        if (this.isBrowser && response.accessToken) {
          const remember = this.resolveStorageMode() !== 'session';
          this.persistAuthState(response, remember);
          this.authEvents.next('login');
        }
      })
    );
  }

  exchangeGithubToken(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/exchange-github-token`, {
      code: code,
      platform: 'web',
      deviceToken: 'web-device'
    }).pipe(
      tap((response: any) => {
        if (this.isBrowser && response.accessToken) {
          const remember = this.resolveStorageMode() !== 'session';
          this.persistAuthState(response, remember);
          this.authEvents.next('login');
        }
      })
    );
  }

  forceChangePassword(payload: { username: string; temporaryPassword: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/force-change-password`, payload);
  }

  forgotPassword(usernameOrEmail: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { usernameOrEmail });
  }

  register(payload: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register`, payload);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const result = !!token;
    return result;
  }

  getToken(): string | null {
    return this.getStoredItem('atg_access_token');
  }

  getRolesFromToken(): string[] {
    if (!this.isBrowser) {
      return [];
    }

    const token = this.getToken();
    if (!token) {
      return [];
    }

    const payload = this.decodeJwtPayload(token);
    const role = payload?.['role'];
    if (!role) {
      return [];
    }

    const normalize = (value: string): string => value.trim().toUpperCase().replace(/^ROLE_/, '');

    if (Array.isArray(role)) {
      return role
        .map((item: unknown) => {
          if (typeof item === 'string') {
            return normalize(item);
          }
          if (item && typeof item === 'object' && 'authority' in item) {
            const authority = (item as { authority?: unknown }).authority;
            if (typeof authority === 'string') {
              return normalize(authority);
            }
          }
          if (item && typeof item === 'object' && 'name' in item) {
            const name = (item as { name?: unknown }).name;
            if (typeof name === 'string') {
              return normalize(name);
            }
          }
          return '';
        })
        .filter((v: string) => !!v);
    }

    if (typeof role === 'string') {
      return [normalize(role)];
    }

    return [];
  }

  hasAnyRole(roles: string[]): boolean {
    const targetRoles = roles.map((role) => role.trim().toUpperCase().replace(/^ROLE_/, ''));
    const assignedRoles = this.getRolesFromToken();
    return assignedRoles.some((assigned) => targetRoles.includes(assigned));
  }

  isAdminUser(): boolean {
    return this.hasAnyRole(['ADMIN', 'OWNER']);
  }

  getDefaultRouteByRole(): string {
    return this.isAdminUser() ? '/admin/dashboard' : '/app/dashboard';
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    try {
      const json = atob(padded);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private normalizeAvatarUrl(rawAvatarUrl: string | null | undefined): string | null {
    const raw = rawAvatarUrl?.trim();
    if (!raw) {
      return null;
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    if (raw.startsWith('/auth/')) {
      return `${API_CONFIG.GATEWAY_URL}${raw}`;
    }

    if (raw.startsWith('/account/')) {
      return `${API_CONFIG.GATEWAY_URL}/auth${raw}`;
    }

    return `${API_CONFIG.GATEWAY_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }
}
