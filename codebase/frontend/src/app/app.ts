import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { AuthService } from './auth/auth.service';
import { SUPPORTED_LANGUAGES } from './i18n/i18n.constants';
import { I18nService } from './i18n/i18n.service';
import { LanguageCode } from './i18n/language.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    TranslateModule,
    NzAvatarModule,
    NzButtonModule,
    NzDividerModule,
    NzIconModule,
    NzLayoutModule,
    NzMenuModule,
    NzPopoverModule,
    NzTagModule,
    NzToolTipModule,
    NzTypographyModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  isCollapsed = true;
  isBrowser: boolean;
  avatarUrl?: string;
  showLayout = true;
  isDarkMode = false;
  readonly languageOptions = SUPPORTED_LANGUAGES;
  currentLanguage: LanguageCode = 'vi';

  constructor(
    private readonly authService: AuthService,
    private readonly i18nService: I18nService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects || event.url;
      this.showLayout = this.authService.isAuthenticated() && !url.includes('/login');
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.showLayout = this.authService.isAuthenticated() && !this.router.url.includes('/login');
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.toggleTheme();
    }
    this.avatarUrl = this.authService.getStoredItem('atg_avatar_url') || undefined;

    this.authService.authEvents.subscribe((event) => {
      if (event === 'login') {
        this.avatarUrl = this.authService.getStoredItem('atg_avatar_url') || undefined;
        this.showLayout = !this.router.url.includes('/login');
        if (this.router.url.startsWith('/login')) {
          this.router.navigateByUrl('/dashboard', { replaceUrl: true });
        }
      } else if (event === 'logout') {
        this.avatarUrl = undefined;
        this.showLayout = false;
      }
    });

    this.currentLanguage = this.i18nService.getCurrentLanguage();
    this.i18nService.currentLanguage$.subscribe((language) => {
      this.currentLanguage = language;
    });
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
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

    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  setLanguage(language: LanguageCode): void {
    void this.i18nService.setLanguage(language);
  }
}
