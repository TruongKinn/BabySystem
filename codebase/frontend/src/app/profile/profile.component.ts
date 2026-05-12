import { Component } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCardModule } from 'ng-zorro-antd/card';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NzAvatarModule, NzCardModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  constructor(private readonly authService: AuthService) {}

  get displayName(): string {
    const firstName = this.authService.getStoredItem('atg_first_name');
    const lastName = this.authService.getStoredItem('atg_last_name');
    const username = this.authService.getStoredItem('atg_username');
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username || 'Family User';
  }

  get role(): string {
    return this.authService.getRolesFromToken()[0] || 'MOM';
  }
}
