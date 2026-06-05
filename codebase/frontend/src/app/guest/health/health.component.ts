import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { GuestNavbarComponent } from '../shared/guest-navbar/guest-navbar.component';
import { GuestFooterComponent } from '../shared/guest-footer/guest-footer.component';
import { I18nService } from '../../i18n/i18n.service';

export interface GrowthRecord {
  month: string;
  weight: number;
  height: number;
}

export interface LogEntry {
  id: number;
  type: 'feed' | 'sleep' | 'diaper' | 'note';
  icon: string;
  iconColor: string;
  title: string;
  time: string;
  note?: string;
}

export interface Vaccine {
  id: number;
  name: string;
  description: string;
  dueDate: string;
  status: 'upcoming' | 'done' | 'overdue';
}

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, GuestNavbarComponent, GuestFooterComponent],
  templateUrl: './health.component.html',
  styleUrl: './health.component.css'
})
export class HealthComponent implements OnInit {
  private i18nService = inject(I18nService);

  showLogModal = false;
  logType: 'feed' | 'sleep' | 'diaper' | 'note' = 'feed';
  logNote = '';
  logDuration = '';
  logTime = '';

  // Baby info
  babyName = 'guest.health.baby.name';
  babyAge = 'guest.health.baby.ageText';

  // Current measurements
  currentWeight = 8.2;
  currentHeight = 68;
  weightChange = '+0.4kg';
  heightChange = '+2cm';

  // Growth chart data (simplified for CSS rendering)
  growthData: GrowthRecord[] = [
    { month: 'guest.health.months.march', weight: 6.8, height: 62 },
    { month: 'guest.health.months.april', weight: 7.2, height: 64 },
    { month: 'guest.health.months.may', weight: 7.8, height: 66 },
    { month: 'guest.health.months.current', weight: 8.2, height: 68 },
  ];

  // Today's log
  todayLog: LogEntry[] = [
    { id: 1, type: 'feed', icon: 'restaurant', iconColor: 'secondary', title: 'guest.health.logs.feed15m', time: 'guest.health.logs.time1030' },
    { id: 2, type: 'sleep', icon: 'bed', iconColor: 'tertiary', title: 'guest.health.logs.sleep45m', time: 'guest.health.logs.time0815' },
    { id: 3, type: 'diaper', icon: 'water_drop', iconColor: 'outline', title: 'guest.health.logs.diaperWet', time: 'guest.health.logs.time0745' },
    { id: 4, type: 'feed', icon: 'restaurant', iconColor: 'secondary', title: 'guest.health.logs.feed20m', time: 'guest.health.logs.time0600' },
  ];

  vaccines: Vaccine[] = [
    {
      id: 1,
      name: 'guest.health.vaccines.v6in1.name',
      description: 'guest.health.vaccines.v6in1.desc',
      dueDate: 'guest.health.vaccines.v6in1.dueDate',
      status: 'upcoming',
    },
    {
      id: 2,
      name: 'guest.health.vaccines.rota.name',
      description: 'guest.health.vaccines.rota.desc',
      dueDate: 'guest.health.vaccines.rota.dueDate',
      status: 'upcoming',
    },
    {
      id: 3,
      name: 'guest.health.vaccines.je.name',
      description: 'guest.health.vaccines.je.desc',
      dueDate: 'guest.health.vaccines.je.dueDate',
      status: 'upcoming',
    },
  ];

  doctorAdvice = {
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSvbGgTqYUS44zXwa-dIcJCHqgd5jfjKlX9XzlAid90oqeIhc7pJMTEInRI4nSW77MebWkJvOgOF18Dmz6HICLsWrDlJ-NKe3-zVOphSsIk1P9FSwtDm_W7QWaU1aV--oHk6NfY1x02h0wpNB7QhEnAnBimSxHuOG0cRGZYaYWfIjJNRB5Ho7yHMUW11uA2kRk63XNaDS1RHZpGGURC4DTS9YUeHmPwFqDEtsZnE5ja_AaMtU0BA-iEVMeTKcXbU0PTTHcwf7a1lg',
    name: 'guest.health.doctor.name',
    text: 'guest.health.doctor.text',
  };

  // Quick actions
  quickActions = [
    { type: 'feed' as const, icon: 'restaurant', label: 'guest.health.log.types.feed', color: 'secondary' },
    { type: 'sleep' as const, icon: 'bed', label: 'guest.health.log.types.sleep', color: 'tertiary' },
    { type: 'diaper' as const, icon: 'water_drop', label: 'guest.health.log.types.diaper', color: 'outline' },
  ];

  // Chart bar heights (percent) for visualization
  get chartBars(): { label: string; weightPct: number; heightPct: number }[] {
    const maxW = Math.max(...this.growthData.map(d => d.weight));
    const maxH = Math.max(...this.growthData.map(d => d.height));
    return this.growthData.map(d => ({
      label: d.month,
      weightPct: Math.round((d.weight / maxW) * 100),
      heightPct: Math.round((d.height / maxH) * 100),
    }));
  }

  openLogModal(type: 'feed' | 'sleep' | 'diaper' | 'note'): void {
    this.logType = type;
    this.logNote = '';
    this.logDuration = '';
    this.logTime = new Date().toTimeString().slice(0, 5);
    this.showLogModal = true;
  }

  closeLogModal(): void {
    this.showLogModal = false;
  }

  submitLog(): void {
    const typeMap = {
      feed: 'guest.health.log.types.feed',
      sleep: 'guest.health.log.types.sleep',
      diaper: 'guest.health.log.types.diaper',
      note: 'guest.health.log.types.note'
    };
    const iconMap = { feed: 'restaurant', sleep: 'bed', diaper: 'water_drop', note: 'note' };
    const colorMap = { feed: 'secondary', sleep: 'tertiary', diaper: 'outline', note: 'primary' };
    
    // Translate type using I18nService dynamically
    const typeLabel = this.i18nService.translate(typeMap[this.logType]);
    const title = this.logDuration
      ? `${typeLabel} (${this.logDuration})`
      : typeLabel;

    const currentHour = parseInt(this.logTime.slice(0, 2));
    const suffixKey = currentHour >= 12 ? 'guest.health.log.timeSuffix.afternoon' : 'guest.health.log.timeSuffix.morning';
    const suffixTranslated = this.i18nService.translate(suffixKey);
    const logTimeStr = this.logTime ? `${this.logTime} ${suffixTranslated}` : this.i18nService.translate('guest.health.log.timeSuffix.justNow');

    this.todayLog.unshift({
      id: Date.now(),
      type: this.logType,
      image: undefined, // no image for quick logs
      icon: iconMap[this.logType],
      iconColor: colorMap[this.logType],
      title,
      time: logTimeStr,
      note: this.logNote || undefined,
    } as any);
    this.closeLogModal();
  }

  getVaccineStatusClass(status: string): string {
    switch (status) {
      case 'upcoming': return 'vaccine-upcoming';
      case 'done': return 'vaccine-done';
      case 'overdue': return 'vaccine-overdue';
      default: return '';
    }
  }

  getVaccineStatusLabel(status: string): string {
    switch (status) {
      case 'upcoming': return 'guest.health.vaccine.status.upcoming';
      case 'done': return 'guest.health.vaccine.status.done';
      case 'overdue': return 'guest.health.vaccine.status.overdue';
      default: return '';
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeLogModal();
  }

  ngOnInit(): void {
    this.initScrollReveal();
  }

  private initScrollReveal(): void {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);
  }
}
