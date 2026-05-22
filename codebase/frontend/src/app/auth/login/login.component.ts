import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { I18nService } from '../../i18n/i18n.service';
import { authConfig } from '../auth.config';
import { AuthService } from '../auth.service';
import { PasswordStrengthComponent } from '../../shared/components/password-strength/password-strength.component';

type AuthMode = 'bearer' | 'keycloak';
type PortalMode = 'user' | 'admin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzAlertModule,
    NzIconModule,
    NzModalModule,
    NzToolTipModule,
    PasswordStrengthComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  @ViewChild('otpInput') otpInput?: ElementRef<HTMLInputElement>;

  loginForm: FormGroup;
  authMode: AuthMode = 'bearer';
  passwordVisible = false;
  isDarkMode = false;
  isBrowser: boolean;
  errorMsg = '';
  isLoading = false;
  requireOtp = false;
  requireCaptcha = false;
  captchaBase64 = '';
  captchaToken = '';
  isVisibleTwoFactorGuide = false;
  isVisibleForceChangePassword = false;
  isForceChangeLoading = false;
  portalMode: PortalMode = 'user';
  forceChangeForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly notification: NzNotificationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly oauthService: OAuthService,
    private readonly i18nService: I18nService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      otp: [''],
      captchaAnswer: [''],
      remember: [true]
    });

    this.forceChangeForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#&()–[\]{}:;',?/*~$^+=<>]).{8,20}$/)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordMatchValidator() }
    );

    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('theme');
      this.isDarkMode = savedTheme === 'dark';
      this.applyTheme();

      this.oauthService.configure(authConfig);
      this.oauthService.setupAutomaticSilentRefresh();

      this.oauthService
        .loadDiscoveryDocumentAndTryLogin()
        .then(() => {
          if (this.oauthService.hasValidAccessToken()) {
            setTimeout(() => this.handleKeycloakCallback(), 0);
          }
        })
        .catch(() => undefined);
    }
  }

  ngOnInit(): void {
    const routePortal = this.route.snapshot.data['portal'] as string | undefined;
    if (routePortal === 'admin' || routePortal === 'user') {
      this.portalMode = routePortal;
    }

    if (this.isBrowser && this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.authService.getDefaultRouteByRole(), { replaceUrl: true });
    }
  }

  selectAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.errorMsg = '';
    this.resetChallengeState();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (!this.isBrowser) return;

    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  applyTheme(): void {
    if (!this.isBrowser) return;

    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  private resetChallengeState(): void {
    this.requireOtp = false;
    this.requireCaptcha = false;
    this.captchaBase64 = '';
    this.captchaToken = '';

    const otpControl = this.loginForm.get('otp');
    otpControl?.clearValidators();
    otpControl?.reset('');
    otpControl?.updateValueAndValidity({ onlySelf: true });

    const captchaControl = this.loginForm.get('captchaAnswer');
    captchaControl?.clearValidators();
    captchaControl?.reset('');
    captchaControl?.updateValueAndValidity({ onlySelf: true });
  }

  refreshCaptcha(): void {
    this.isLoading = true;
    this.authService.getCaptcha().subscribe({
      next: (res) => {
        this.isLoading = false;
        this.captchaToken = res.captchaToken;
        this.captchaBase64 = res.base64Image;
        this.loginForm.get('captchaAnswer')?.reset('');
      },
      error: (err) => {
        this.isLoading = false;
        this.notification.error(
          this.i18nService.translate('common.errorTitle'),
          this.i18nService.translate('auth.login.messages.captchaLoadFailed', {
            message: err.error?.message || err.message || ''
          })
        );
      }
    });
  }

  loginWithKeycloak(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.oauthService.initCodeFlow();
  }

  openTwoFactorGuide(): void {
    this.isVisibleTwoFactorGuide = true;
  }

  closeTwoFactorGuide(): void {
    this.isVisibleTwoFactorGuide = false;
  }

  closeForceChangePasswordModal(): void {
    this.isVisibleForceChangePassword = false;
    this.forceChangeForm.reset();
  }

  openTwoFactorSetup(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/2fa-setup']);
      return;
    }
    this.openTwoFactorGuide();
  }

  handleKeycloakCallback(): void {
    const keycloakToken = this.oauthService.getAccessToken();
    if (!keycloakToken) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.authService.exchangeKeycloakToken(keycloakToken).subscribe({
      next: () => {
        this.isLoading = false;
        this.resetChallengeState();
        this.notification.success(
          this.i18nService.translate('auth.login.messages.loginSuccessTitle'),
          this.i18nService.translate('auth.login.messages.loginSuccessDesc')
        );
        this.router.navigateByUrl(this.resolvePostLoginRoute(), { replaceUrl: true });
      },
      error: (err) => {
        this.isLoading = false;
        const message = err.error?.message || this.i18nService.translate('auth.login.messages.keycloakVerifyFailed');
        setTimeout(() => {
          this.errorMsg = message;
        });
        this.notification.error(this.i18nService.translate('auth.login.messages.loginFailedTitle'), message);
      }
    });
  }

  submitForm(): void {
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';

    const loginData: any = {
      username: this.loginForm.value.username,
      password: this.loginForm.value.password,
      platform: 'web',
      deviceToken: 'web-device',
      remember: this.loginForm.value.remember
    };

    if (this.requireOtp && this.loginForm.value.otp) {
      loginData.otp = this.loginForm.value.otp;
    }

    if (this.requireCaptcha) {
      loginData.captchaToken = this.captchaToken;
      loginData.captchaAnswer = this.loginForm.value.captchaAnswer;
    }

    this.authService.login(loginData).subscribe({
      next: (res) => {
        this.isLoading = false;
        const errorMessage = res.error?.message || res.message || (typeof res === 'string' ? res : '');

        if (errorMessage.includes('REQUIRES_CAPTCHA') || errorMessage.includes('CAPTCHA')) {
          this.requireCaptcha = true;
          this.refreshCaptcha();
          this.loginForm.get('captchaAnswer')?.setValidators([Validators.required]);
          this.loginForm.get('captchaAnswer')?.updateValueAndValidity();

          this.notification.warning(
            this.i18nService.translate('auth.login.messages.captchaRequiredTitle'),
            this.i18nService.translate('auth.login.messages.captchaRequiredDesc'),
            { nzPlacement: 'topRight', nzDuration: 5000 }
          );

          this.errorMsg = errorMessage.includes('Invalid')
            ? this.i18nService.translate('auth.login.messages.captchaInvalid')
            : this.i18nService.translate('auth.login.messages.captchaRequiredSimple');
          return;
        }

        if (
          errorMessage.includes('PASSWORD_CHANGE_REQUIRED')
        ) {
          this.openForceChangePasswordModal();
          return;
        }

        if (
          errorMessage.includes('OTP is required') ||
          errorMessage.includes('OTP code') ||
          (res.status === 401 && !errorMessage.includes('Bad credentials'))
        ) {
          this.requireOtp = true;
          this.loginForm.get('otp')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
          this.loginForm.get('otp')?.updateValueAndValidity();

          this.notification.warning(
            this.i18nService.translate('auth.login.messages.twoFactorRequiredTitle'),
            this.i18nService.translate('auth.login.messages.twoFactorRequiredDesc'),
            { nzPlacement: 'topRight', nzDuration: 5000 }
          );

          setTimeout(() => this.otpInput?.nativeElement.focus(), 100);
          return;
        }

        if (res.accessToken) {
          this.resetChallengeState();
          this.notification.success(
            this.i18nService.translate('auth.login.messages.loginSuccessTitle'),
            this.i18nService.translate('auth.login.messages.loginSuccessDesc')
          );
          this.router.navigateByUrl(this.resolvePostLoginRoute(), { replaceUrl: true });
          return;
        }

        const fallbackMessage =
          errorMessage || this.i18nService.translate('auth.login.messages.loginFailedFallback');
        setTimeout(() => {
          this.errorMsg = fallbackMessage;
        });
        this.notification.error(this.i18nService.translate('auth.login.messages.loginFailedTitle'), fallbackMessage);

        if (this.requireCaptcha) {
          this.refreshCaptcha();
        }
      },
      error: (err) => {
        this.isLoading = false;
        const errorMessage = err.error?.message || err.message || (typeof err === 'string' ? err : '');

        if (
          errorMessage.includes('PASSWORD_CHANGE_REQUIRED')
        ) {
          this.openForceChangePasswordModal();
          return;
        }

        if (
          errorMessage.includes('OTP is required') ||
          errorMessage.includes('OTP code') ||
          errorMessage.includes('2FA')
        ) {
          this.requireOtp = true;
          this.loginForm.get('otp')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
          this.loginForm.get('otp')?.updateValueAndValidity();

          this.notification.warning(
            this.i18nService.translate('auth.login.messages.twoFactorRequiredTitle'),
            this.i18nService.translate('auth.login.messages.twoFactorRequiredDesc'),
            { nzPlacement: 'topRight', nzDuration: 5000 }
          );

          setTimeout(() => this.otpInput?.nativeElement.focus(), 100);
        }

        const fallbackMessage =
          errorMessage || this.i18nService.translate('auth.login.messages.loginFailedFallback');
        setTimeout(() => {
          this.errorMsg = fallbackMessage;
        });
        this.notification.error(this.i18nService.translate('auth.login.messages.loginFailedTitle'), fallbackMessage);

        if (this.requireCaptcha) {
          this.refreshCaptcha();
        }
      }
    });
  }

  submitForceChangePassword(): void {
    if (this.forceChangeForm.invalid) {
      Object.values(this.forceChangeForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const username = String(this.loginForm.value.username || '').trim();
    const temporaryPassword = String(this.loginForm.value.password || '');
    const newPassword = String(this.forceChangeForm.value.newPassword || '');

    if (!username || !temporaryPassword) {
      this.notification.error(
        this.i18nService.translate('auth.login.messages.loginFailedTitle'),
        this.i18nService.translate('auth.login.messages.forceChangeMissingContext')
      );
      return;
    }

    this.isForceChangeLoading = true;
    this.authService.forceChangePassword({ username, temporaryPassword, newPassword }).subscribe({
      next: () => {
        this.isForceChangeLoading = false;
        this.notification.success(
          this.i18nService.translate('auth.login.messages.forceChangeSuccessTitle'),
          this.i18nService.translate('auth.login.messages.forceChangeSuccessDesc')
        );

        this.closeForceChangePasswordModal();
        this.loginForm.patchValue({
          password: newPassword,
          otp: '',
          captchaAnswer: ''
        });
        this.resetChallengeState();
        this.submitForm();
      },
      error: (err) => {
        this.isForceChangeLoading = false;
        const message = err.error?.message || this.i18nService.translate('auth.login.messages.forceChangeFailed');
        this.notification.error(this.i18nService.translate('auth.login.messages.loginFailedTitle'), message);
      }
    });
  }

  private openForceChangePasswordModal(): void {
    this.isVisibleForceChangePassword = true;
    this.forceChangeForm.reset();
    this.notification.info(
      this.i18nService.translate('auth.login.messages.forceChangeRequiredTitle'),
      this.i18nService.translate('auth.login.messages.forceChangeRequiredDesc'),
      { nzPlacement: 'topRight', nzDuration: 5000 }
    );
  }

  private passwordMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const newPassword = group.get('newPassword')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;
      if (!newPassword || !confirmPassword) {
        return null;
      }
      return newPassword === confirmPassword ? null : { mismatch: true };
    };
  }

  private resolvePostLoginRoute(): string {
    const requestedRedirect = this.route.snapshot.queryParamMap.get('redirect');
    const isAdminUser = this.authService.isAdminUser();

    if (requestedRedirect && requestedRedirect.startsWith('/')) {
      if (requestedRedirect.startsWith('/admin') && !isAdminUser) {
        return '/app/dashboard';
      }
      if (requestedRedirect.startsWith('/app') && isAdminUser) {
        return '/admin/dashboard';
      }
      return requestedRedirect;
    }

    if (this.portalMode === 'admin' && !isAdminUser) {
      return '/app/dashboard';
    }

    return this.authService.getDefaultRouteByRole();
  }
}
