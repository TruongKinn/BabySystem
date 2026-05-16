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
  /** Keep sidebar collapsed by default, expand on hover */
  isCollapsed = true;

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
  private metisInstance: { dispose?: () => void } | null = null;
  private metisModulePromise?: Promise<typeof import('metismenujs')>;
  private metisInitVersion = 0;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isBrowser) {
      return;
    }

    if (changes['menuItems'] && this.metisMenuEl?.nativeElement) {
      // Dùng setTimeout thay vì queueMicrotask để đảm bảo Angular đã render xong DOM mới
      setTimeout(() => {
        void this.initMetisMenu();
      }, 50);
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      void this.initMetisMenu();
    }
  }

  private async initMetisMenu(): Promise<void> {
    const menuElement = this.metisMenuEl?.nativeElement;
    if (!menuElement) {
      return;
    }

    const currentVersion = ++this.metisInitVersion;
    this.disposeMetisMenu();

    this.metisModulePromise ??= import('metismenujs');
    const { MetisMenu } = await this.metisModulePromise;

    // Ignore stale async init calls to avoid duplicate listeners.
    if (currentVersion !== this.metisInitVersion || !this.metisMenuEl?.nativeElement) {
      return;
    }

    this.metisInstance = new MetisMenu(menuElement, {
      triggerElement: '.has-submenu > a',
      toggle: true,
    });
  }

  ngOnDestroy(): void {
    this.metisInitVersion++;
    this.disposeMetisMenu();
  }

  private disposeMetisMenu(): void {
    if (!this.metisInstance) {
      return;
    }

    try {
      this.metisInstance.dispose?.();
    } catch { }
    this.metisInstance = null;
  }

  /** Track-by để tránh re-render không cần thiết */
  trackByLabel(_: number, item: MenuItem): string {
    return item.labelKey;
  }

  onLogout(): void {
    this.logout.emit();
  }
}
