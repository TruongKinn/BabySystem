import { Component, inject, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@Component({
  selector: 'app-guest-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    NzButtonModule,
    NzMenuModule,
    NzDropDownModule
  ],
  templateUrl: './guest-navbar.component.html',
  styleUrl: './guest-navbar.component.css'
})
export class GuestNavbarComponent {
  private router = inject(Router);

  isMobileMenuOpen = false;

  navItems = [
    { label: 'guest.common.navbar.home', route: '/guest/home' },
    { label: 'guest.common.navbar.handbook', route: '/guest/handbook' },
    { label: 'guest.common.navbar.shop', route: '/guest/shop' },
    { label: 'guest.common.navbar.community', route: '/guest/community' },
    { label: 'guest.common.navbar.health', route: '/guest/health' },
  ];

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  navigateToLogin(): void {
    this.router.navigate(['/app/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-guest-navbar')) {
      this.isMobileMenuOpen = false;
    }
  }
}
