import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

declare const MetisMenu: any;

export interface MenuItem {
  labelKey: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Sidebar tự quản lý collapse — mở khi hover, đóng khi rời chuột */
  isCollapsed = true;

  @Input() isDarkMode = false;
  @Input() username = '';
  @Input() userInitials = '';
  @Input() avatarUrl?: string;

  @ViewChild('metisMenuEl', { static: false }) metisMenuEl!: ElementRef<HTMLElement>;

  @HostBinding('class.collapsed') get collapsedClass() {
    return this.isCollapsed;
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isCollapsed = false;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isCollapsed = true;
  }

  isBrowser: boolean;
  private metisInstance: any = null;

  readonly menuItems: MenuItem[] = [
    {
      labelKey: 'momApp.layout.menu.overview',
      icon: 'grid',
      children: [
        {
          labelKey: 'momApp.layout.menu.dashboard',
          icon: 'home',
          route: '/dashboard',
        },
      ],
    },
    {
      labelKey: 'momApp.layout.menu.familyCare',
      icon: 'heart',
      children: [
        { labelKey: 'momApp.layout.menu.baby', icon: 'smile', route: '/baby' },
        { labelKey: 'momApp.layout.menu.meals', icon: 'coffee', route: '/meals' },
        { labelKey: 'momApp.layout.menu.tasks', icon: 'check-square', route: '/tasks' },
      ],
    },
    {
      labelKey: 'momApp.layout.menu.finance',
      icon: 'wallet',
      children: [
        { labelKey: 'momApp.layout.menu.expenses', icon: 'wallet', route: '/expenses' },
        { labelKey: 'momApp.layout.menu.shopping', icon: 'shopping-cart', route: '/shopping' },
        { labelKey: 'momApp.layout.menu.insights', icon: 'bar-chart-2', route: '/insights' },
      ],
    },
    {
      labelKey: 'momApp.layout.menu.account',
      icon: 'users',
      children: [
        { labelKey: 'momApp.layout.menu.family', icon: 'users', route: '/family' },
        { labelKey: 'momApp.layout.menu.profile', icon: 'user', route: '/profile' },
        { labelKey: 'momApp.layout.menu.settings', icon: 'settings', route: '/settings' },
      ],
    },
  ];

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initMetisMenu();
    }
  }

  private initMetisMenu(): void {
    if (!this.metisMenuEl?.nativeElement) return;

    // Destroy old instance
    if (this.metisInstance) {
      try {
        this.metisInstance.dispose();
      } catch {}
    }

    import('metismenujs').then(({ MetisMenu }) => {
      this.metisInstance = new MetisMenu(this.metisMenuEl.nativeElement, {
        triggerElement: '.has-submenu > a',
        toggle: true,
      });
    });
  }

  ngOnDestroy(): void {
    if (this.metisInstance) {
      try {
        this.metisInstance.dispose();
      } catch {}
    }
  }

  /** Track-by để tránh re-render không cần thiết */
  trackByLabel(_: number, item: MenuItem): string {
    return item.labelKey;
  }
}
