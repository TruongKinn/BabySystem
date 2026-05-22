import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { BehaviorSubject, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { DashboardSnapshot } from '../core/models/super-app.model';
import { MockSuperAppService } from '../core/services/mock-super-app.service';
import {
  FamilyQuestRewardCatalogItem,
  FamilyQuestRewardRedemption,
  FamilyQuestState,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
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

interface DashboardQuestMission {
  key: string;
  icon: string;
  title: string;
  detail: string;
  done: boolean;
  points: number;
}

interface DashboardQuestView {
  missions: DashboardQuestMission[];
  completedMissions: number;
  completionPercent: number;
  rewardPoints: number;
  claimedToday: boolean;
  canClaim: boolean;
  streakDays: number;
  totalPoints: number;
  currentTierLabel: string;
  nextTierLabel: string | null;
  pointsToNextTier: number;
  tierProgressPercent: number;
}

interface DashboardQuestTier {
  minPoints: number;
  labelKey: string;
}

interface DashboardQuestMissionTemplate {
  key: string;
  icon: string;
  points: number;
  titleKey: string;
  detailKey: string;
  isDone: (snapshot: DashboardSnapshot, budgetPercent: number) => boolean;
  params: (snapshot: DashboardSnapshot, budgetPercent: number) => Record<string, unknown>;
}

interface DashboardQuestRewardView {
  rewardKey: string;
  name: string;
  description: string;
  costPoints: number;
  canRedeem: boolean;
}

interface DashboardQuestRedemptionView {
  id: number;
  rewardName: string;
  costPoints: number;
  redeemedAtLabel: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TranslateModule, RouterLink, NzCardModule, NzIconModule, NzButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly questDailyMissionLimit = 4;
  private readonly questTiers: DashboardQuestTier[] = [
    { minPoints: 0, labelKey: 'momApp.dashboard.quest.tiers.seed' },
    { minPoints: 300, labelKey: 'momApp.dashboard.quest.tiers.bloom' },
    { minPoints: 900, labelKey: 'momApp.dashboard.quest.tiers.star' },
    { minPoints: 1800, labelKey: 'momApp.dashboard.quest.tiers.legend' }
  ];
  private readonly data = inject(MockSuperAppService);
  private readonly command = inject(SuperAppCommandService);
  private readonly i18n = inject(I18nService);
  private readonly message = inject(NzMessageService);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private questClaimInProgress = false;
  private questRedeemInProgressKey: string | null = null;

  readonly vm$ = this.refresh$.pipe(
    switchMap(() =>
      forkJoin({
        snapshot: this.data.getDashboard(),
        questState: this.command.getFamilyQuestState().pipe(
          catchError(() =>
            of<FamilyQuestState>({
              familyId: this.command.getFamilyId(),
              lastClaimDate: null,
              streakDays: 0,
              totalPoints: 0,
              claimedToday: false
            })
          )
        ),
        rewardCatalog: this.command.getFamilyQuestRewardCatalog().pipe(catchError(() => of<FamilyQuestRewardCatalogItem[]>([]))),
        redemptions: this.command.getFamilyQuestRedemptions().pipe(catchError(() => of<FamilyQuestRewardRedemption[]>([])))
      })
    ),
    map(({ snapshot, questState, rewardCatalog, redemptions }) => {
      const budgetPercent = this.budgetUsagePercent(snapshot);
      const quest = this.buildQuest(snapshot, budgetPercent, questState);

      return {
        snapshot,
        familyScore: this.buildFamilyScore(snapshot.moodScore, snapshot.baby.sleepHours, snapshot.pendingTasks, snapshot.expense),
        todayLabel: this.formatToday(),
        budgetPercent,
        budgetRemaining: Math.max(0, snapshot.expense.monthlyBudget - snapshot.expense.monthlySpent),
        priorities: this.buildPriorities(snapshot, budgetPercent),
        timeline: this.buildTimeline(snapshot),
        quest,
        questRewards: this.buildQuestRewardViews(rewardCatalog, quest.totalPoints),
        questRedemptions: this.buildQuestRedemptionViews(redemptions),
        claimInProgress: this.questClaimInProgress,
        redeemInProgressKey: this.questRedeemInProgressKey
      };
    })
  );

  claimQuestReward(quest: DashboardQuestView): void {
    if (!quest.canClaim || this.questClaimInProgress) {
      return;
    }

    this.questClaimInProgress = true;
    this.command
      .claimFamilyQuestReward(quest.rewardPoints)
      .pipe(
        finalize(() => {
          this.questClaimInProgress = false;
          this.refresh$.next();
        })
      )
      .subscribe({
        next: (state) => {
          this.message.success(
            this.i18n.translate('momApp.dashboard.quest.claimSuccess', {
              points: quest.rewardPoints,
              streak: state.streakDays
            })
          );
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error && error.message?.trim()
              ? error.message
              : this.i18n.translate('momApp.dashboard.quest.claimFailed');
          this.message.error(message);
        }
      });
  }

  redeemQuestReward(reward: DashboardQuestRewardView): void {
    if (!reward.canRedeem || this.questRedeemInProgressKey) {
      return;
    }

    this.questRedeemInProgressKey = reward.rewardKey;
    this.command
      .redeemFamilyQuestReward(reward.rewardKey)
      .pipe(
        finalize(() => {
          this.questRedeemInProgressKey = null;
          this.refresh$.next();
        })
      )
      .subscribe({
        next: () => {
          this.message.success(
            this.i18n.translate('momApp.dashboard.quest.redeemSuccess', {
              reward: reward.name,
              points: reward.costPoints
            })
          );
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error && error.message?.trim()
              ? error.message
              : this.i18n.translate('momApp.dashboard.quest.redeemFailed');
          this.message.error(message);
        }
      });
  }

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

  private buildQuest(
    snapshot: DashboardSnapshot,
    budgetPercent: number,
    questState: FamilyQuestState
  ): DashboardQuestView {
    const missionPool = this.buildQuestMissionPool(snapshot);
    const selectedMissions = this.selectDailyMissions(
      missionPool,
      questState.familyId,
      this.todayKey(),
      this.questDailyMissionLimit
    );

    const missions: DashboardQuestMission[] = selectedMissions.map((mission) => ({
      key: mission.key,
      icon: mission.icon,
      title: this.i18n.translate(mission.titleKey),
      detail: this.i18n.translate(mission.detailKey, mission.params(snapshot, budgetPercent)),
      done: mission.isDone(snapshot, budgetPercent),
      points: mission.points
    }));

    const completedMissions = missions.filter((mission) => mission.done).length;
    const rewardPoints = missions.reduce((sum, mission) => sum + mission.points, 0);
    const completionPercent = Math.round((completedMissions / missions.length) * 100);

    const claimedToday = !!questState.claimedToday;
    const canClaim = completedMissions === missions.length && !claimedToday;

    const tier = this.resolveQuestTier(questState.totalPoints);
    const nextTier = this.resolveNextQuestTier(questState.totalPoints);

    return {
      missions,
      completedMissions,
      completionPercent,
      rewardPoints,
      claimedToday,
      canClaim,
      streakDays: Math.max(0, questState.streakDays),
      totalPoints: Math.max(0, questState.totalPoints),
      currentTierLabel: this.i18n.translate(tier.labelKey),
      nextTierLabel: nextTier ? this.i18n.translate(nextTier.labelKey) : null,
      pointsToNextTier: nextTier ? Math.max(0, nextTier.minPoints - questState.totalPoints) : 0,
      tierProgressPercent: this.resolveTierProgressPercent(questState.totalPoints, tier, nextTier)
    };
  }

  private buildQuestMissionPool(snapshot: DashboardSnapshot): DashboardQuestMissionTemplate[] {
    const hasBabyProfile = !!snapshot.baby.babyName?.trim();
    const missionPoints = 25;
    const pool: DashboardQuestMissionTemplate[] = [];

    if (hasBabyProfile) {
      pool.push(
        {
          key: 'sleep_10h',
          icon: 'moon',
          points: missionPoints,
          titleKey: 'momApp.dashboard.quest.missions.sleep10.title',
          detailKey: 'momApp.dashboard.quest.missions.sleep10.detail',
          isDone: (vm) => vm.baby.sleepHours >= 10,
          params: (vm) => ({ hours: vm.baby.sleepHours })
        },
        {
          key: 'sleep_11h',
          icon: 'cloud',
          points: missionPoints,
          titleKey: 'momApp.dashboard.quest.missions.sleep11.title',
          detailKey: 'momApp.dashboard.quest.missions.sleep11.detail',
          isDone: (vm) => vm.baby.sleepHours >= 11,
          params: (vm) => ({ hours: vm.baby.sleepHours })
        },
        {
          key: 'feeding_5',
          icon: 'coffee',
          points: missionPoints,
          titleKey: 'momApp.dashboard.quest.missions.feedings5.title',
          detailKey: 'momApp.dashboard.quest.missions.feedings5.detail',
          isDone: (vm) => vm.baby.feedings >= 5,
          params: (vm) => ({ count: vm.baby.feedings })
        },
        {
          key: 'diaper_3',
          icon: 'skin',
          points: missionPoints,
          titleKey: 'momApp.dashboard.quest.missions.diapers3.title',
          detailKey: 'momApp.dashboard.quest.missions.diapers3.detail',
          isDone: (vm) => vm.baby.diaperChanges >= 3,
          params: (vm) => ({ count: vm.baby.diaperChanges })
        }
      );
    } else {
      pool.push(
        {
          key: 'meal_1',
          icon: 'coffee',
          points: missionPoints,
          titleKey: 'momApp.dashboard.quest.missions.meal1.title',
          detailKey: 'momApp.dashboard.quest.missions.meal1.detail',
          isDone: (vm) => vm.todayMeals.length >= 1,
          params: (vm) => ({ count: vm.todayMeals.length })
        },
        {
          key: 'meal_2',
          icon: 'gift',
          points: missionPoints,
          titleKey: 'momApp.dashboard.quest.missions.meal2.title',
          detailKey: 'momApp.dashboard.quest.missions.meal2.detail',
          isDone: (vm) => vm.todayMeals.length >= 2,
          params: (vm) => ({ count: vm.todayMeals.length })
        }
      );
    }

    pool.push(
      {
        key: 'tasks_2',
        icon: 'check-square',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.tasks2.title',
        detailKey: 'momApp.dashboard.quest.missions.tasks2.detail',
        isDone: (vm) => vm.pendingTasks <= 2,
        params: (vm) => ({ count: vm.pendingTasks })
      },
      {
        key: 'tasks_1',
        icon: 'flag',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.tasks1.title',
        detailKey: 'momApp.dashboard.quest.missions.tasks1.detail',
        isDone: (vm) => vm.pendingTasks <= 1,
        params: (vm) => ({ count: vm.pendingTasks })
      },
      {
        key: 'budget_80',
        icon: 'wallet',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.budget80.title',
        detailKey: 'momApp.dashboard.quest.missions.budget80.detail',
        isDone: (vm, budgetPercent) => vm.expense.monthlyBudget <= 0 || budgetPercent <= 80,
        params: (_vm, budgetPercent) => ({ percent: budgetPercent })
      },
      {
        key: 'budget_70',
        icon: 'safety',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.budget70.title',
        detailKey: 'momApp.dashboard.quest.missions.budget70.detail',
        isDone: (vm, budgetPercent) => vm.expense.monthlyBudget <= 0 || budgetPercent <= 70,
        params: (_vm, budgetPercent) => ({ percent: budgetPercent })
      },
      {
        key: 'mood_70',
        icon: 'heart',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.mood70.title',
        detailKey: 'momApp.dashboard.quest.missions.mood70.detail',
        isDone: (vm) => vm.moodScore >= 70,
        params: (vm) => ({ score: vm.moodScore })
      },
      {
        key: 'mood_80',
        icon: 'smile',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.mood80.title',
        detailKey: 'momApp.dashboard.quest.missions.mood80.detail',
        isDone: (vm) => vm.moodScore >= 80,
        params: (vm) => ({ score: vm.moodScore })
      },
      {
        key: 'shopping_clear',
        icon: 'shopping-cart',
        points: missionPoints,
        titleKey: 'momApp.dashboard.quest.missions.shopping0.title',
        detailKey: 'momApp.dashboard.quest.missions.shopping0.detail',
        isDone: (vm) => vm.shoppingReminders === 0,
        params: (vm) => ({ count: vm.shoppingReminders })
      }
    );

    return pool;
  }

  private selectDailyMissions(
    templates: DashboardQuestMissionTemplate[],
    familyId: number,
    dayKey: string,
    limit: number
  ): DashboardQuestMissionTemplate[] {
    if (templates.length <= limit) {
      return templates;
    }

    const shuffled = [...templates];
    let seedState = this.hashSeed(`${familyId}:${dayKey}`);
    for (let idx = shuffled.length - 1; idx > 0; idx -= 1) {
      seedState = this.nextSeed(seedState);
      const pivot = seedState % (idx + 1);
      const temp = shuffled[idx];
      shuffled[idx] = shuffled[pivot];
      shuffled[pivot] = temp;
    }

    return shuffled.slice(0, limit);
  }

  private hashSeed(raw: string): number {
    let hash = 2166136261;
    for (let idx = 0; idx < raw.length; idx += 1) {
      hash ^= raw.charCodeAt(idx);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private nextSeed(state: number): number {
    return (Math.imul(state, 1664525) + 1013904223) >>> 0;
  }

  private buildQuestRewardViews(
    catalog: FamilyQuestRewardCatalogItem[],
    totalPoints: number
  ): DashboardQuestRewardView[] {
    return [...catalog]
      .sort((left, right) => left.costPoints - right.costPoints)
      .map((reward) => ({
        rewardKey: reward.rewardKey,
        name: reward.name,
        description: reward.description,
        costPoints: reward.costPoints,
        canRedeem: totalPoints >= reward.costPoints
      }));
  }

  private buildQuestRedemptionViews(redemptions: FamilyQuestRewardRedemption[]): DashboardQuestRedemptionView[] {
    const locale = this.resolveLocale();
    return redemptions.map((item) => ({
      id: item.id,
      rewardName: item.rewardName,
      costPoints: item.costPoints,
      redeemedAtLabel: item.redeemedAt
        ? new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(item.redeemedAt))
        : '-'
    }));
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

  private todayKey(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private budgetUsagePercent(snapshot: DashboardSnapshot): number {
    return snapshot.expense.monthlyBudget > 0
      ? this.clamp(Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100), 0, 100)
      : 0;
  }

  private resolveQuestTier(totalPoints: number): DashboardQuestTier {
    const ordered = [...this.questTiers].sort((left, right) => left.minPoints - right.minPoints);
    let current = ordered[0];
    for (const tier of ordered) {
      if (totalPoints >= tier.minPoints) {
        current = tier;
      }
    }
    return current;
  }

  private resolveNextQuestTier(totalPoints: number): DashboardQuestTier | null {
    const ordered = [...this.questTiers].sort((left, right) => left.minPoints - right.minPoints);
    return ordered.find((tier) => tier.minPoints > totalPoints) ?? null;
  }

  private resolveTierProgressPercent(
    totalPoints: number,
    currentTier: DashboardQuestTier,
    nextTier: DashboardQuestTier | null
  ): number {
    if (!nextTier) {
      return 100;
    }

    const range = Math.max(1, nextTier.minPoints - currentTier.minPoints);
    const covered = Math.max(0, totalPoints - currentTier.minPoints);
    return this.clamp(Math.round((covered / range) * 100), 0, 100);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
