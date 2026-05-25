import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, ViewChild, TemplateRef } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { AuthService } from './auth/auth.service';
import { PREMIUM_FEATURE_KEYS } from './core/constants/premium-feature.constants';
import { ResolvedPremiumFeature, SuperAppCommandService } from './core/services/super-app-command.service';
import { UserPreferencesService } from './core/services/user-preferences.service';
import { LanguageOption, SUPPORTED_LANGUAGES } from './i18n/i18n.constants';
import { I18nService } from './i18n/i18n.service';
import { LanguageCode } from './i18n/language.model';
import { MenuItem, SidebarComponent } from './shared/sidebar/sidebar.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NotificationWebsocketService } from './core/services/notification-websocket.service';
import { Subscription } from 'rxjs';
import { NotificationBellComponent } from './shared/components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    NzAvatarModule,
    NzDividerModule,
    NzIconModule,
    NzPopoverModule,
    SidebarComponent,
    NotificationBellComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  isBrowser: boolean;
  avatarUrl?: string;
  showLayout = true;
  isDarkMode = false;
  homeRoute = '/app/dashboard';
  sidebarMenuItems: MenuItem[] = [];
  readonly languageOptions = SUPPORTED_LANGUAGES;
  currentLanguage: LanguageCode = 'vi';
  languagePopoverVisible = false;
  private notificationSub?: Subscription;
  private premiumThemeEnabled = true;
  private readonly themeCustomizationFeatureKey = PREMIUM_FEATURE_KEYS.themeCustomization;

  @ViewChild('customNotificationTemplate', { static: true }) customNotificationTemplate!: TemplateRef<{ $implicit: any, data: any }>;

  readonly userMenuItems: MenuItem[] = [
    {
      labelKey: 'momApp.layout.menu.overview',
      icon: 'grid',
      children: [{ labelKey: 'momApp.layout.menu.dashboard', icon: 'home', route: '/app/dashboard' }]
    },
    {
      labelKey: 'momApp.layout.menu.familyCare',
      icon: 'heart',
      children: [
        { labelKey: 'momApp.layout.menu.baby', icon: 'smile', route: '/app/baby' },
        { labelKey: 'momApp.layout.menu.meals', icon: 'coffee', route: '/app/meals' },
        { labelKey: 'momApp.layout.menu.tasks', icon: 'check-square', route: '/app/tasks' },
        { labelKey: 'momApp.layout.menu.documents', icon: 'file-text', route: '/app/documents' }
      ]
    },
    {
      labelKey: 'momApp.layout.menu.finance',
      icon: 'wallet',
      children: [
        { labelKey: 'momApp.layout.menu.expenses', icon: 'wallet', route: '/app/expenses' },
        { labelKey: 'momApp.layout.menu.shopping', icon: 'shopping-cart', route: '/app/shopping' },
        { labelKey: 'momApp.layout.menu.insights', icon: 'bar-chart-2', route: '/app/insights' }
      ]
    },
    {
      labelKey: 'momApp.layout.menu.account',
      icon: 'users',
      children: [
        { labelKey: 'momApp.layout.menu.family', icon: 'users', route: '/app/family' },
        { labelKey: 'momApp.layout.menu.profile', icon: 'user', route: '/app/profile' },
        { labelKey: 'momApp.layout.menu.settings', icon: 'settings', route: '/app/settings' },
        { labelKey: 'momApp.layout.menu.themeSettings', icon: 'bg-colors', route: '/app/settings/theme' }
      ]
    }
  ];
  readonly adminMenuItems: MenuItem[] = [
    {
      labelKey: 'momApp.admin.menu.portal',
      icon: 'grid',
      children: [
        { labelKey: 'momApp.admin.menu.dashboard', icon: 'home', route: '/admin/dashboard' },
        { labelKey: 'momApp.admin.menu.users', icon: 'users', route: '/admin/users' },
        { labelKey: 'momApp.admin.menu.families', icon: 'users', route: '/admin/families' },
        { labelKey: 'momApp.admin.menu.premium', icon: 'star', route: '/admin/premium' },
        { labelKey: 'momApp.admin.menu.finance', icon: 'wallet', route: '/admin/finance' },
        { labelKey: 'momApp.admin.menu.exportPasswords', icon: 'key', route: '/admin/export-passwords' },
        { labelKey: 'momApp.admin.menu.themeSettings', icon: 'bg-colors', route: '/admin/settings/theme' },
        { labelKey: 'momApp.admin.menu.access', icon: 'check-square', route: '/admin/access' },
        { labelKey: 'momApp.admin.menu.permissions', icon: 'settings', route: '/admin/permissions' }
      ]
    }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly command: SuperAppCommandService,
    private readonly userPreferences: UserPreferencesService,
    private readonly i18nService: I18nService,
    private readonly router: Router,
    private readonly nzNotification: NzNotificationService,
    private readonly notificationWs: NotificationWebsocketService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.sidebarMenuItems = this.userMenuItems;

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects || event.url;
      this.showLayout = this.authService.isAuthenticated() && !url.includes('/login');
      this.syncPortalState(url);
      this.refreshThemeEntitlement();
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.showLayout = this.authService.isAuthenticated() && !this.router.url.includes('/login');
    this.syncPortalState(this.router.url);
    this.applyStoredAppearance();
    this.refreshThemeEntitlement();
    this.avatarUrl = this.authService.getStoredItem('atg_avatar_url') || undefined;

    this.authService.authEvents.subscribe((event) => {
      if (event === 'login') {
        this.avatarUrl = this.authService.getStoredItem('atg_avatar_url') || undefined;
        this.showLayout = !this.router.url.includes('/login');
        if (this.router.url.includes('/login')) {
          this.router.navigateByUrl(this.authService.getDefaultRouteByRole(), { replaceUrl: true });
        }
        this.refreshThemeEntitlement();
        this.notificationWs.connect();
      } else if (event === 'logout') {
        this.avatarUrl = undefined;
        this.showLayout = false;
        this.premiumThemeEnabled = true;
        this.notificationWs.disconnect();
      }
    });

    if (this.authService.isAuthenticated()) {
      this.notificationWs.connect();
    }

    this.notificationSub = this.notificationWs.notifications$.subscribe(notification => {
      this.nzNotification.template(this.customNotificationTemplate, {
        nzData: notification,
        nzDuration: 8000,
        nzClass: 'premium-notification-wrapper'
      });
    });

    this.currentLanguage = this.i18nService.getCurrentLanguage();
    this.i18nService.currentLanguage$.subscribe((language) => {
      this.currentLanguage = language;
    });
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  get isAdminRoute(): boolean {
    return this.router.url.startsWith('/admin');
  }

  get currentLanguageOption(): LanguageOption {
    return this.getLanguageOption(this.currentLanguage);
  }

  get username(): string {
    const firstName = this.authService.getStoredItem('atg_first_name');
    const lastName = this.authService.getStoredItem('atg_last_name');
    const username = this.authService.getStoredItem('atg_username');

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username || this.i18nService.translate('momApp.layout.userFallback');
  }

  get userInitials(): string {
    return this.username.charAt(0).toUpperCase();
  }

  logout(): void {
    this.avatarUrl = undefined;
    this.authService.logout();
  }

  toggleTheme(): void {
    if (!this.isBrowser) {
      return;
    }

    const nextTheme = this.userPreferences.toggleTheme({ allowPremiumTheme: this.premiumThemeEnabled });
    this.isDarkMode = nextTheme === 'dark';
  }

  setLanguage(language: LanguageCode): void {
    this.languagePopoverVisible = false;
    if (language === this.currentLanguage) {
      return;
    }
    void this.i18nService.setLanguage(language);
  }

  trackByLanguageCode(_index: number, language: LanguageOption): LanguageCode {
    return language.code;
  }

  private syncPortalState(url: string): void {
    if (url.startsWith('/admin')) {
      this.homeRoute = '/admin/dashboard';
      this.sidebarMenuItems = this.adminMenuItems;
      return;
    }

    this.homeRoute = '/app/dashboard';
    this.sidebarMenuItems = this.userMenuItems;
  }

  private applyStoredAppearance(): void {
    const preferences = this.userPreferences.getPreferences();
    this.isDarkMode = preferences.theme === 'dark';
    this.userPreferences.applyAppearance(preferences, this.premiumThemeEnabled);
  }

  private refreshThemeEntitlement(): void {
    if (!this.isBrowser || !this.authService.isAuthenticated()) {
      return;
    }

    if (this.authService.isAdminUser() || this.router.url.startsWith('/admin')) {
      this.premiumThemeEnabled = true;
      this.applyStoredAppearance();
      return;
    }

    this.command.getResolvedFamilyFeatures().subscribe((features) => {
      this.premiumThemeEnabled = this.isFeatureEnabled(features, this.themeCustomizationFeatureKey);
      this.applyStoredAppearance();
    });
  }

  private isFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string): boolean {
    return features.some((item) => item.featureKey === featureKey && item.enabled === true);
  }

  private getLanguageOption(code: LanguageCode): LanguageOption {
    return this.languageOptions.find((item) => item.code === code) ?? this.languageOptions[0];
  }

  ngOnDestroy(): void {
    if (this.notificationSub) {
      this.notificationSub.unsubscribe();
    }
  }
}
