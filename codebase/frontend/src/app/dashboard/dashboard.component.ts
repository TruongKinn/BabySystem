import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { map } from 'rxjs';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import { I18nService } from '../i18n/i18n.service';

interface DashboardPriority {
  tone: 'critical' | 'warning' | 'info';
  icon: string;
  title: string;
  hint: string;
  link: string;
}

interface DashboardTimelineItem {
  icon: string;
  title: string;
  detail: string;
  tone: 'orange' | 'teal' | 'violet' | 'pink';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TranslateModule, RouterLink, NzCardModule, NzIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly data = inject(MockSuperAppService);
  private readonly i18n = inject(I18nService);

  readonly vm$ = this.data.getDashboard().pipe(
    map((snapshot) => {
      const budgetPercent =
        snapshot.expense.monthlyBudget > 0
          ? Math.max(0, Math.min(100, Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)))
          : 0;

      return {
        snapshot,
        familyScore: this.buildFamilyScore(snapshot.moodScore, snapshot.baby.sleepHours, snapshot.pendingTasks, snapshot.expense),
        todayLabel: this.formatToday(),
        budgetPercent,
        budgetRemaining: Math.max(0, snapshot.expense.monthlyBudget - snapshot.expense.monthlySpent),
        priorities: this.buildPriorities(snapshot, budgetPercent),
        timeline: this.buildTimeline(snapshot)
      };
    })
  );

  private buildFamilyScore(
    moodScore: number,
    sleepHours: number,
    pendingTasks: number,
    expense: { monthlyBudget: number; monthlySpent: number }
  ): number {
    const sleepScore = this.clamp(Math.round((sleepHours / 12) * 100), 0, 100);
    const workloadScore = this.clamp(100 - pendingTasks * 10, 0, 100);
    const budgetPercent = expense.monthlyBudget > 0 ? Math.round((expense.monthlySpent / expense.monthlyBudget) * 100) : 0;
    const budgetScore = this.clamp(100 - budgetPercent, 0, 100);
    const average = Math.round((moodScore + sleepScore + workloadScore + budgetScore) / 4);
    return this.clamp(average, 0, 100);
  }

  private buildPriorities(
    snapshot: {
      pendingTasks: number;
      shoppingReminders: number;
      baby: { nextVaccination: string };
      expense: { monthlyBudget: number; monthlySpent: number };
    },
    budgetPercent: number
  ): DashboardPriority[] {
    const priorities: DashboardPriority[] = [];

    if (budgetPercent >= 85) {
      priorities.push({
        tone: budgetPercent >= 100 ? 'critical' : 'warning',
        icon: 'warning',
        title: this.i18n.translate('momApp.dashboard.priorities.budget.title'),
        hint: this.i18n.translate('momApp.dashboard.priorities.budget.hint', { percent: budgetPercent }),
        link: '/app/expenses'
      });
    }

    if (snapshot.pendingTasks >= 5) {
      priorities.push({
        tone: 'warning',
        icon: 'profile',
        title: this.i18n.translate('momApp.dashboard.priorities.tasks.title'),
        hint: this.i18n.translate('momApp.dashboard.priorities.tasks.hint', { count: snapshot.pendingTasks }),
        link: '/app/tasks'
      });
    }

    if (snapshot.shoppingReminders > 0) {
      priorities.push({
        tone: 'info',
        icon: 'shopping-cart',
        title: this.i18n.translate('momApp.dashboard.priorities.shopping.title'),
        hint: this.i18n.translate('momApp.dashboard.priorities.shopping.hint', { count: snapshot.shoppingReminders }),
        link: '/app/shopping'
      });
    }

    if (snapshot.baby.nextVaccination) {
      priorities.push({
        tone: 'info',
        icon: 'medicine-box',
        title: this.i18n.translate('momApp.dashboard.priorities.vaccine.title'),
        hint: this.i18n.translate('momApp.dashboard.priorities.vaccine.hint', {
          date: snapshot.baby.nextVaccination
        }),
        link: '/app/baby'
      });
    }

    if (priorities.length === 0) {
      priorities.push({
        tone: 'info',
        icon: 'check-circle',
        title: this.i18n.translate('momApp.dashboard.priorities.noUrgent.title'),
        hint: this.i18n.translate('momApp.dashboard.priorities.noUrgent.hint'),
        link: '/app/insights'
      });
    }

    return priorities;
  }

  private buildTimeline(snapshot: {
    todayMeals: string[];
    baby: { sleepHours: number; feedings: number; diaperChanges: number };
    pendingTasks: number;
    shoppingReminders: number;
  }): DashboardTimelineItem[] {
    const meals = snapshot.todayMeals.length;
    return [
      {
        icon: 'coffee',
        title: this.i18n.translate('momApp.dashboard.timeline.meals.title'),
        detail:
          meals > 0
            ? this.i18n.translate('momApp.dashboard.timeline.meals.detail', { count: meals })
            : this.i18n.translate('momApp.dashboard.timeline.meals.empty'),
        tone: 'orange'
      },
      {
        icon: 'smile',
        title: this.i18n.translate('momApp.dashboard.timeline.baby.title'),
        detail: this.i18n.translate('momApp.dashboard.timeline.baby.detail', {
          hours: snapshot.baby.sleepHours,
          feedings: snapshot.baby.feedings,
          diapers: snapshot.baby.diaperChanges
        }),
        tone: 'teal'
      },
      {
        icon: 'schedule',
        title: this.i18n.translate('momApp.dashboard.timeline.workload.title'),
        detail: this.i18n.translate('momApp.dashboard.timeline.workload.detail', {
          tasks: snapshot.pendingTasks,
          shopping: snapshot.shoppingReminders
        }),
        tone: 'violet'
      }
    ];
  }

  private formatToday(): string {
    return new Intl.DateTimeFormat(this.resolveLocale(), {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date());
  }

  private resolveLocale(): string {
    return this.i18n.getCurrentLanguage() === 'en' ? 'en-US' : 'vi-VN';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
