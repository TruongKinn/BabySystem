import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { I18nService } from '../../i18n/i18n.service';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../../i18n/i18n.constants';
import { LanguageCode } from '../../i18n/language.model';
import { AuthService } from '../auth.service';
import { PasswordStrengthComponent } from '../../shared/components/password-strength/password-strength.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzAlertModule,
    NzIconModule,
    NzToolTipModule,
    NzStepsModule,
    PasswordStrengthComponent
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  passwordVisible = false;
  confirmPasswordVisible = false;
  isLoading = false;
  errorMsg = '';
  currentStep = 0;

  supportedLanguages = SUPPORTED_LANGUAGES;
  isLangDropdownOpen = false;

  get currentLanguageOption(): LanguageOption {
    const code = this.i18nService.getCurrentLanguage();
    return this.supportedLanguages.find(lang => lang.code === code) || this.supportedLanguages[0];
  }

  toggleLangDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isLangDropdownOpen = !this.isLangDropdownOpen;
  }

  selectLanguage(code: LanguageCode): void {
    this.i18nService.setLanguage(code);
    this.isLangDropdownOpen = false;
  }

  getFlagEmoji(code: LanguageCode): string {
    switch (code) {
      case 'vi': return '🇻🇳';
      case 'en': return '🇬🇧';
      case 'ja': return '🇯🇵';
      case 'zh': return '🇨🇳';
      default: return '🌐';
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isLangDropdownOpen = false;
  }

  nextStep(): void {
    if (this.currentStep === 0) {
      // Validate Step 1: username, email, password, confirmPassword
      const step1Fields = ['username', 'email', 'password', 'confirmPassword'];
      let isStep1Valid = true;
      step1Fields.forEach(field => {
        const control = this.registerForm.get(field);
        if (control) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
          if (control.invalid) {
            isStep1Valid = false;
          }
        }
      });
      // Check password mismatch
      if (this.registerForm.errors?.['mismatch']) {
        isStep1Valid = false;
        // Mark confirmPassword as dirty to show the mismatch error
        this.registerForm.get('confirmPassword')?.markAsDirty();
        this.registerForm.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
      }

      if (isStep1Valid) {
        this.currentStep = 1;
      }
    } else if (this.currentStep === 1) {
      // Validate Step 2: lastName, firstName, phone
      const step2Fields = ['lastName', 'firstName', 'phone'];
      let isStep2Valid = true;
      step2Fields.forEach(field => {
        const control = this.registerForm.get(field);
        if (control) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
          if (control.invalid) {
            isStep2Valid = false;
          }
        }
      });

      if (isStep2Valid) {
        this.currentStep = 2;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly notification: NzNotificationService,
    private readonly router: Router,
    private readonly i18nService: I18nService
  ) {
    this.registerForm = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#&()–[\]{}:;',?/*~$^+=<>]).{8,20}$/)]],
        confirmPassword: ['', [Validators.required]],
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        phone: ['', [Validators.pattern(/^\+?[0-9]{9,15}$/)]]
      },
      { validators: this.passwordMatchValidator() }
    );
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl(this.authService.getDefaultRouteByRole(), { replaceUrl: true });
    }
  }

  private passwordMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get('password')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;
      if (!password || !confirmPassword) {
        return null;
      }
      return password === confirmPassword ? null : { mismatch: true };
    };
  }

  submitForm(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    if (this.currentStep !== 2) {
      this.nextStep();
      return;
    }

    this.isLoading = true;
    this.errorMsg = '';

    const payload = {
      username: this.registerForm.value.username,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      phone: this.registerForm.value.phone || ''
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.notification.success(
          this.i18nService.translate('app.register.messages.registerSuccessTitle'),
          this.i18nService.translate('app.register.messages.registerSuccessDesc')
        );

        // Pre-fill username in login page
        localStorage.setItem('remembered_username', payload.username);
        
        this.router.navigate(['/app/login']);
      },
      error: (err) => {
        this.isLoading = false;
        const fallback = this.i18nService.translate('app.register.messages.registerFailedDesc');
        this.errorMsg = err.error?.message || err.message || fallback;
        this.notification.error(
          this.i18nService.translate('app.register.messages.registerFailedTitle'),
          this.errorMsg
        );
      }
    });
  }
}
