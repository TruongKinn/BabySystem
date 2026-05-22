import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule, TranslateModule, NzIconModule],
  templateUrl: './password-strength.component.html',
  styleUrls: ['./password-strength.component.css']
})
export class PasswordStrengthComponent implements OnChanges {
  @Input() password = '';

  strength = 0;
  hasLength = false;
  hasUpper = false;
  hasLower = false;
  hasNumber = false;
  hasSpecial = false;

  get strengthLabel(): string {
    if (!this.password) return '';
    if (this.strength <= 1) return 'auth.login.forceChangeModal.strengthWeak';
    if (this.strength === 2 || this.strength === 3) return 'auth.login.forceChangeModal.strengthMedium';
    if (this.strength >= 4) return 'auth.login.forceChangeModal.strengthStrong';
    return '';
  }

  get strengthClass(): string {
    if (!this.password) return '';
    if (this.strength <= 1) return 'weak';
    if (this.strength === 2 || this.strength === 3) return 'medium';
    if (this.strength >= 4) return 'strong';
    return '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['password']) {
      this.evaluatePassword();
    }
  }

  private evaluatePassword(): void {
    const p = this.password || '';
    this.hasLength = p.length >= 8 && p.length <= 20;
    this.hasUpper = /[A-Z]/.test(p);
    this.hasLower = /[a-z]/.test(p);
    this.hasNumber = /[0-9]/.test(p);
    this.hasSpecial = /[!@#&()–[\]{}:;',?/*~$^+=<>]/.test(p);

    let score = 0;
    if (this.hasLength) score += 1;
    if (this.hasUpper && this.hasLower) score += 1;
    if (this.hasNumber) score += 1;
    if (this.hasSpecial) score += 1;
    if (this.hasLength && this.hasUpper && this.hasLower && this.hasNumber && this.hasSpecial) {
      score = 5;
    }
    
    this.strength = score;
  }
}
