import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

declare const MetisMenu: any;

export interface MenuItem {
  labelKey: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    labelKey: 'momApp.layout.menu.overview',
    icon: 'grid',
    children: [
      {
        labelKey: 'momApp.layout.menu.dashboard',
        icon: 'home',
        route: '/app/dashboard',
      },
    ],
  },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  /** Keep sidebar expanded to avoid accidental close while navigating */
  isCollapsed = false;

  @Input() isDarkMode = false;
  @Input() username = '';
  @Input() userInitials = '';
  @Input() avatarUrl?: string;
  @Input() homeRoute = '/app/dashboard';
  @Input() menuItems: MenuItem[] = DEFAULT_MENU_ITEMS;
  @Input() isUserMode = true;

  @Output() logout = new EventEmitter<void>();

  @ViewChild('metisMenuEl', { static: false }) metisMenuEl!: ElementRef<HTMLElement>;

  @HostBinding('class.collapsed') get collapsedClass() {
    return this.isCollapsed;
  }

  @HostBinding('class.user-mode') get userModeClass() {
    return this.isUserMode;
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

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isBrowser) {
      return;
    }

    if (changes['menuItems'] && this.metisMenuEl?.nativeElement) {
      queueMicrotask(() => this.initMetisMenu());
    }
  }

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
      } catch { }
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
      } catch { }
    }
  }

  /** Track-by để tránh re-render không cần thiết */
  trackByLabel(_: number, item: MenuItem): string {
    return item.labelKey;
  }

  onLogout(): void {
    this.logout.emit();
  }
}
