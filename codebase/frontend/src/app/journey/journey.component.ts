import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslateModule } from '@ngx-translate/core';
import { PREMIUM_FEATURE_KEYS } from '../core/constants/premium-feature.constants';
import {
  BabyDashboard,
  BabyGrowthRecord,
  BabyProfile,
  BabyVaccination,
  FileMetadata,
  JourneyEventApi,
  ResolvedPremiumFeature,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

type JourneyEventType = 'CARE' | 'GROWTH' | 'HEALTH' | 'FAMILY' | 'MEMORY' | 'CAPSULE';
type JourneyEventSource = 'SYSTEM' | 'MANUAL' | 'AI' | 'CAPSULE';
type JourneyPrivacy = 'FAMILY' | 'PARENTS' | 'PRIVATE';

interface JourneyEvent {
  id: string;
  babyId: number;
  title: string;
  story: string;
  happenedAt: string;
  type: JourneyEventType;
  privacy: JourneyPrivacy;
  source: JourneyEventSource;
  sourceRef?: string;
  capsuleOpenAt?: string | null;
  recipient?: string | null;
  createdAt: string;
  createdBy: string;
}

interface JourneyEventView extends JourneyEvent {
  icon: string;
  color: string;
  typeLabel: string;
  privacyLabel: string;
  dateLabel: string;
  displayStory: string;
  persisted: boolean;
  locked: boolean;
  sourceLabel: string;
}

interface JourneySuggestion {
  id: string;
  babyId: number;
  title: string;
  detail: string;
  reason: string;
  happenedAt: string;
  type: JourneyEventType;
  confidence: number;
  icon: string;
  color: string;
  saved: boolean;
}

interface JourneyDnaLayer {
  key: string;
  label: string;
  value: number;
  max: number;
  meta: string;
  icon: string;
  tone: string;
}

interface JourneyTypeConfig {
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzDatePickerModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTabsModule,
    NzTagModule,
    NzTimelineModule
  ],
  templateUrl: './journey.component.html',
  styleUrl: './journey.component.css'
})
export class JourneyComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  private readonly destroy$ = new Subject<void>();
  private readonly journeyFeatureKey = PREMIUM_FEATURE_KEYS.babyJourneyPlus;
  private readonly eventTypeConfig: Record<JourneyEventType, JourneyTypeConfig> = {
    CARE: { label: 'Care Rhythm', icon: 'heart', color: 'green' },
    GROWTH: { label: 'Growth Story', icon: 'line-chart', color: 'blue' },
    HEALTH: { label: 'Health Signal', icon: 'medicine-box', color: 'red' },
    FAMILY: { label: 'Family Voice', icon: 'team', color: 'purple' },
    MEMORY: { label: 'Visual Memory', icon: 'camera', color: 'gold' },
    CAPSULE: { label: 'Time Capsule', icon: 'lock', color: 'gray' }
  };

  babyProfiles: BabyProfile[] = [];
  selectedBabyId: number | null = null;
  dashboard: BabyDashboard | null = null;
  growthRecords: BabyGrowthRecord[] = [];
  vaccinations: BabyVaccination[] = [];
  galleryFiles: FileMetadata[] = [];

  journeyPlusEnabled = false;
  isLoading = true;
  loadError: string | null = null;
  isCreateMemoryModalVisible = false;
  isCreateCapsuleModalVisible = false;
  isSubmittingMemory = false;
  isSubmittingCapsule = false;

  timelineEvents: JourneyEventView[] = [];
  suggestions: JourneySuggestion[] = [];
  dnaLayers: JourneyDnaLayer[] = [];
  capsuleEvents: JourneyEventView[] = [];
  storybookEvents: JourneyEventView[] = [];
  selectedMonthKey = this.currentMonthKey();
  private persistedEvents: JourneyEvent[] = [];

  readonly eventTypes: JourneyEventType[] = ['CARE', 'GROWTH', 'HEALTH', 'FAMILY', 'MEMORY'];
  readonly privacyOptions: JourneyPrivacy[] = ['FAMILY', 'PARENTS', 'PRIVATE'];

  readonly createMemoryForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['MEMORY' as JourneyEventType, [Validators.required]],
    happenedAt: [new Date(), [Validators.required]],
    privacy: ['FAMILY' as JourneyPrivacy, [Validators.required]],
    story: ['', [Validators.required, Validators.maxLength(900)]]
  });

  readonly createCapsuleForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    recipient: ['', [Validators.maxLength(120)]],
    openAt: [this.defaultCapsuleOpenDate(), [Validators.required]],
    privacy: ['PRIVATE' as JourneyPrivacy, [Validators.required]],
    message: ['', [Validators.required, Validators.maxLength(1200)]]
  });

  ngOnInit(): void {
    this.loadWorkspace();

    this.i18n.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.selectedBabyId) {
          this.rebuildJourneyState();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedBaby(): BabyProfile | null {
    if (!this.selectedBabyId) {
      return null;
    }
    return this.babyProfiles.find((baby) => baby.id === this.selectedBabyId) ?? null;
  }

  get isJourneyLocked(): boolean {
    return !this.journeyPlusEnabled;
  }

  get dnaScore(): number {
    if (this.dnaLayers.length === 0) {
      return 0;
    }

    const total = this.dnaLayers.reduce((sum, item) => sum + Math.min(item.value, item.max), 0);
    const max = this.dnaLayers.reduce((sum, item) => sum + item.max, 0);
    return max > 0 ? Math.round((total / max) * 100) : 0;
  }

  get dnaScoreGrade(): { cls: string; icon: string; label: string } {
    const score = this.dnaScore;
    if (score >= 70) {
      return { cls: 'score-grade score-grade-great', icon: 'star', label: this.i18n.translate('app.journey.score.grade.great') };
    }
    if (score >= 40) {
      return { cls: 'score-grade score-grade-good', icon: 'smile', label: this.i18n.translate('app.journey.score.grade.good') };
    }
    return { cls: 'score-grade score-grade-start', icon: 'plus-circle', label: this.i18n.translate('app.journey.score.grade.start') };
  }

  get capsuleLockedCount(): number {
    return this.capsuleEvents.filter((event) => event.locked).length;
  }

  get storybookTitle(): string {
    const [year, month] = this.selectedMonthKey.split('-');
    return `Storybook ${month}/${year}`;
  }

  loadWorkspace(): void {
    this.isLoading = true;
    this.loadError = null;

    forkJoin({
      features: this.command.getResolvedFamilyFeatures().pipe(catchError(() => of([] as ResolvedPremiumFeature[]))),
      babies: this.command.getBabies().pipe(
        catchError((err) => {
          this.loadError = err?.message || this.i18n.translate('app.journey.errors.loadBabies');
          return of([] as BabyProfile[]);
        })
      )
    }).subscribe(({ features, babies }) => {
      this.journeyPlusEnabled = this.hasFeatureEnabled(features, this.journeyFeatureKey);
      this.babyProfiles = babies;
      this.selectedBabyId = this.resolveInitialBabyId(babies);

      if (!this.selectedBabyId) {
        this.dashboard = null;
        this.growthRecords = [];
        this.vaccinations = [];
        this.galleryFiles = [];
        this.rebuildJourneyState();
        this.isLoading = false;
        return;
      }

      this.loadBabyContext(this.selectedBabyId);
    });
  }

  onSelectedBabyChange(babyId: number | null): void {
    this.selectedBabyId = babyId;
    if (!babyId) {
      this.dashboard = null;
      this.growthRecords = [];
      this.vaccinations = [];
      this.galleryFiles = [];
      this.rebuildJourneyState();
      return;
    }
    this.loadBabyContext(babyId);
  }

  openCreateMemoryModal(): void {
    if (!this.ensurePremiumAccess()) {
      return;
    }
    if (!this.selectedBabyId) {
      this.notification.warning('Journey+', this.i18n.translate('app.journey.notifications.chooseBaby'));
      return;
    }

    this.createMemoryForm.reset({
      title: '',
      type: 'MEMORY',
      happenedAt: new Date(),
      privacy: 'FAMILY',
      story: ''
    });
    this.isCreateMemoryModalVisible = true;
  }

  closeCreateMemoryModal(): void {
    this.isCreateMemoryModalVisible = false;
  }

  submitCreateMemory(): void {
    if (!this.ensurePremiumAccess() || !this.selectedBabyId) {
      return;
    }
    if (this.createMemoryForm.invalid) {
      this.createMemoryForm.markAllAsTouched();
      return;
    }

    const happenedAt = this.resolveDate(this.createMemoryForm.controls.happenedAt.value) ?? new Date();
    const event: JourneyEvent = {
      id: this.createId('memory'),
      babyId: this.selectedBabyId,
      title: this.createMemoryForm.controls.title.value?.trim() ?? '',
      story: this.createMemoryForm.controls.story.value?.trim() ?? '',
      happenedAt: happenedAt.toISOString(),
      type: this.createMemoryForm.controls.type.value ?? 'MEMORY',
      privacy: this.createMemoryForm.controls.privacy.value ?? 'FAMILY',
      source: 'MANUAL',
      capsuleOpenAt: null,
      recipient: null,
      createdAt: new Date().toISOString(),
      createdBy: 'Family'
    };

    this.isSubmittingMemory = true;
    this.command.createJourneyEvent(this.selectedBabyId, {
      id: event.id,
      babyId: event.babyId,
      title: event.title,
      story: event.story,
      happenedAt: event.happenedAt,
      type: event.type as JourneyEventApi['type'],
      privacy: event.privacy as JourneyEventApi['privacy'],
      source: event.source as JourneyEventApi['source'],
      sourceRef: event.sourceRef ?? null,
      capsuleOpenAt: event.capsuleOpenAt ?? null,
      recipient: event.recipient ?? null,
      createdAt: event.createdAt,
      createdBy: event.createdBy
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.persistedEvents = [this.apiToEvent(saved), ...this.persistedEvents];
        this.isSubmittingMemory = false;
        this.isCreateMemoryModalVisible = false;
        this.rebuildJourneyState();
        this.notification.success('Journey+', this.i18n.translate('app.journey.notifications.saveSuccess'));
      },
      error: () => {
        this.isSubmittingMemory = false;
      }
    });
  }

  openCreateCapsuleModal(): void {
    if (!this.ensurePremiumAccess()) {
      return;
    }
    if (!this.selectedBabyId) {
      this.notification.warning('Journey+', this.i18n.translate('app.journey.notifications.chooseBaby'));
      return;
    }

    this.createCapsuleForm.reset({
      title: '',
      recipient: this.selectedBaby?.name ?? '',
      openAt: this.defaultCapsuleOpenDate(),
      privacy: 'PRIVATE',
      message: ''
    });
    this.isCreateCapsuleModalVisible = true;
  }

  closeCreateCapsuleModal(): void {
    this.isCreateCapsuleModalVisible = false;
  }

  submitCreateCapsule(): void {
    if (!this.ensurePremiumAccess() || !this.selectedBabyId) {
      return;
    }
    if (this.createCapsuleForm.invalid) {
      this.createCapsuleForm.markAllAsTouched();
      return;
    }

    const openAt = this.resolveDate(this.createCapsuleForm.controls.openAt.value) ?? this.defaultCapsuleOpenDate();
    if (openAt.getTime() <= Date.now()) {
      this.notification.warning('Journey+', this.i18n.translate('app.journey.notifications.futureDateRequired'));
      return;
    }

    const event: JourneyEvent = {
      id: this.createId('capsule'),
      babyId: this.selectedBabyId,
      title: this.createCapsuleForm.controls.title.value?.trim() ?? '',
      story: this.createCapsuleForm.controls.message.value?.trim() ?? '',
      happenedAt: openAt.toISOString(),
      type: 'CAPSULE',
      privacy: this.createCapsuleForm.controls.privacy.value ?? 'PRIVATE',
      source: 'CAPSULE',
      capsuleOpenAt: openAt.toISOString(),
      recipient: this.createCapsuleForm.controls.recipient.value?.trim() || this.selectedBaby?.name || null,
      createdAt: new Date().toISOString(),
      createdBy: 'Family'
    };

    this.isSubmittingCapsule = true;
    this.command.createJourneyEvent(this.selectedBabyId, {
      id: event.id,
      babyId: event.babyId,
      title: event.title,
      story: event.story,
      happenedAt: event.happenedAt,
      type: event.type as JourneyEventApi['type'],
      privacy: event.privacy as JourneyEventApi['privacy'],
      source: event.source as JourneyEventApi['source'],
      sourceRef: event.sourceRef ?? null,
      capsuleOpenAt: event.capsuleOpenAt ?? null,
      recipient: event.recipient ?? null,
      createdAt: event.createdAt,
      createdBy: event.createdBy
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.persistedEvents = [this.apiToEvent(saved), ...this.persistedEvents];
        this.isSubmittingCapsule = false;
        this.isCreateCapsuleModalVisible = false;
        this.rebuildJourneyState();
        this.notification.success('Journey+', this.i18n.translate('app.journey.notifications.capsuleSuccess'));
      },
      error: () => {
        this.isSubmittingCapsule = false;
      }
    });
  }

  saveSuggestion(suggestion: JourneySuggestion): void {
    if (!this.ensurePremiumAccess() || suggestion.saved) {
      return;
    }

    const reasonLabel = this.i18n.getCurrentLanguage() === 'en' ? 'AI Curator Reason' : 'Lý do AI Curator';
    const event: JourneyEvent = {
      id: this.createId('ai'),
      babyId: suggestion.babyId,
      title: suggestion.title,
      story: `${suggestion.detail}\n\n${reasonLabel}: ${suggestion.reason}`,
      happenedAt: suggestion.happenedAt,
      type: suggestion.type,
      privacy: 'FAMILY',
      source: 'AI',
      sourceRef: suggestion.id,
      capsuleOpenAt: null,
      recipient: null,
      createdAt: new Date().toISOString(),
      createdBy: 'AI Curator'
    };

    const babyId = this.selectedBabyId ?? suggestion.babyId;
    this.command.createJourneyEvent(babyId, {
      id: event.id,
      babyId: event.babyId,
      title: event.title,
      story: event.story,
      happenedAt: event.happenedAt,
      type: event.type as JourneyEventApi['type'],
      privacy: event.privacy as JourneyEventApi['privacy'],
      source: event.source as JourneyEventApi['source'],
      sourceRef: event.sourceRef ?? null,
      capsuleOpenAt: null,
      recipient: null,
      createdAt: event.createdAt,
      createdBy: event.createdBy
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        this.persistedEvents = [this.apiToEvent(saved), ...this.persistedEvents];
        this.rebuildJourneyState();
        this.notification.success('AI Curator', this.i18n.translate('app.journey.notifications.aiSuggestionSuccess'));
      }
    });
  }

  deleteEvent(event: JourneyEventView): void {
    if (!event.persisted || !this.selectedBabyId) {
      return;
    }

    this.command.deleteJourneyEvent(this.selectedBabyId, event.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.persistedEvents = this.persistedEvents.filter((item) => item.id !== event.id);
          this.rebuildJourneyState();
          this.notification.success('Journey+', this.i18n.translate('app.journey.notifications.deleteSuccess'));
        }
      });
  }

  eventTypeLabel(type: JourneyEventType): string {
    const keyMap: Record<JourneyEventType, string> = {
      CARE: 'app.journey.types.care',
      GROWTH: 'app.journey.types.growth',
      HEALTH: 'app.journey.types.health',
      FAMILY: 'app.journey.types.family',
      MEMORY: 'app.journey.types.visual',
      CAPSULE: 'app.journey.types.capsule'
    };
    return this.i18n.translate(keyMap[type]);
  }

  privacyLabel(privacy: JourneyPrivacy): string {
    if (privacy === 'PARENTS') {
      return this.i18n.translate('app.journey.privacy.parents');
    }
    if (privacy === 'PRIVATE') {
      return this.i18n.translate('app.journey.privacy.private');
    }
    return this.i18n.translate('app.journey.privacy.family');
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(this.resolveLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString(this.resolveLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDecimal(value: number | null | undefined, unit = ''): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'N/A';
    }
    return `${Number(value).toFixed(1)}${unit}`;
  }

  trackByBaby(_: number, baby: BabyProfile): number {
    return baby.id;
  }

  trackByEvent(_: number, event: JourneyEventView): string {
    return event.id;
  }

  trackBySuggestion(_: number, suggestion: JourneySuggestion): string {
    return suggestion.id;
  }

  trackByDna(_: number, layer: JourneyDnaLayer): string {
    return layer.key;
  }

  onMonthChange(): void {
    this.rebuildJourneyState();
  }

  private loadBabyContext(babyId: number): void {
    this.isLoading = true;
    this.loadError = null;

    forkJoin({
      dashboard: this.command
        .getBabyDashboard({
          babyId,
          date: this.todayKey(),
          trendDays: 14,
          recentLogLimit: 14,
          upcomingVaccineLimit: 8
        })
        .pipe(catchError(() => of(null))),
      growthRecords: this.command.getGrowthRecords(babyId).pipe(catchError(() => of([] as BabyGrowthRecord[]))),
      vaccinations: this.command.getVaccinations(babyId).pipe(catchError(() => of([] as BabyVaccination[]))),
      galleryFiles: this.command.getFiles('baby-gallery', `baby:${babyId}`).pipe(catchError(() => of([] as FileMetadata[]))),
      journeyEvents: this.command.getJourneyEvents(babyId).pipe(catchError(() => of([] as JourneyEventApi[])))
    }).subscribe(({ dashboard, growthRecords, vaccinations, galleryFiles, journeyEvents }) => {
      this.dashboard = dashboard;
      this.growthRecords = [...growthRecords].sort((left, right) => right.measuredAt.localeCompare(left.measuredAt));
      this.vaccinations = [...vaccinations].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
      this.galleryFiles = [...galleryFiles].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      this.persistedEvents = journeyEvents.map((api) => this.apiToEvent(api));
      this.rebuildJourneyState();
      this.isLoading = false;
    });
  }

  private rebuildJourneyState(): void {
    const storedEvents = this.persistedEvents.filter((event) => this.belongsToSelectedBaby(event));
    const systemEvents = this.buildSystemEvents();

    this.timelineEvents = [...storedEvents, ...systemEvents]
      .map((event) => this.toEventView(event, event.source !== 'SYSTEM'))
      .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt));

    this.capsuleEvents = this.timelineEvents
      .filter((event) => event.type === 'CAPSULE')
      .sort((left, right) => Date.parse(left.happenedAt) - Date.parse(right.happenedAt));

    this.suggestions = this.buildSuggestions(storedEvents);
    this.dnaLayers = this.buildDnaLayers(storedEvents);
    this.storybookEvents = this.timelineEvents.filter((event) => event.happenedAt.startsWith(this.selectedMonthKey)).slice(0, 8);
  }

  private buildSystemEvents(): JourneyEvent[] {
    if (!this.selectedBabyId || !this.dashboard) {
      return [];
    }

    const events: JourneyEvent[] = [];
    const summary = this.dashboard.dailySummary;
    if (summary.lastUpdatedAt) {
      events.push({
        id: `system-care-${this.selectedBabyId}-${summary.date}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.systemEvents.care.title'),
        story: this.i18n.translate('app.journey.systemEvents.care.story', {
          feedings: summary.feedings,
          diaperChanges: summary.diaperChanges,
          sleepHours: this.formatDecimal(summary.sleepHours)
        }),
        happenedAt: summary.lastUpdatedAt,
        type: 'CARE',
        privacy: 'FAMILY',
        source: 'SYSTEM',
        createdAt: summary.lastUpdatedAt,
        createdBy: 'BabySystem'
      });
    }

    const latestGrowth = this.growthRecords[0];
    if (latestGrowth) {
      events.push({
        id: `system-growth-${this.selectedBabyId}-${latestGrowth.id}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.systemEvents.growth.title'),
        story: this.i18n.translate('app.journey.systemEvents.growth.story', {
          weightKg: this.formatDecimal(latestGrowth.weightKg),
          heightCm: this.formatDecimal(latestGrowth.heightCm),
          headCircumferenceCm: this.formatDecimal(latestGrowth.headCircumferenceCm)
        }),
        happenedAt: this.resolveDate(`${latestGrowth.measuredAt}T08:00:00`)?.toISOString() ?? new Date().toISOString(),
        type: 'GROWTH',
        privacy: 'FAMILY',
        source: 'SYSTEM',
        createdAt: new Date().toISOString(),
        createdBy: 'BabySystem'
      });
    }

    const nextVaccine = this.dashboard.vaccinationInsight.upcomingVaccinations[0] ?? this.vaccinations.find((item) => !item.completed);
    if (nextVaccine) {
      events.push({
        id: `system-vaccine-${this.selectedBabyId}-${nextVaccine.id}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.systemEvents.health.title', { vaccineName: nextVaccine.vaccineName }),
        story: this.i18n.translate('app.journey.systemEvents.health.story', { dueDate: this.formatDate(nextVaccine.dueDate) }),
        happenedAt: this.resolveDate(`${nextVaccine.dueDate}T09:00:00`)?.toISOString() ?? new Date().toISOString(),
        type: 'HEALTH',
        privacy: 'PARENTS',
        source: 'SYSTEM',
        createdAt: new Date().toISOString(),
        createdBy: 'BabySystem'
      });
    }

    const latestImage = this.galleryFiles[0];
    if (latestImage) {
      events.push({
        id: `system-gallery-${this.selectedBabyId}-${latestImage.id}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.systemEvents.visual.title'),
        story: this.i18n.translate('app.journey.systemEvents.visual.story', { fileName: latestImage.originalFileName }),
        happenedAt: latestImage.createdAt,
        type: 'MEMORY',
        privacy: 'FAMILY',
        source: 'SYSTEM',
        createdAt: latestImage.createdAt,
        createdBy: 'BabySystem'
      });
    }

    return events;
  }

  private buildSuggestions(storedEvents: JourneyEvent[]): JourneySuggestion[] {
    if (!this.selectedBabyId || !this.dashboard) {
      return [];
    }

    const savedRefs = new Set(storedEvents.map((event) => event.sourceRef).filter((value): value is string => !!value));
    const suggestions: JourneySuggestion[] = [];
    const summary = this.dashboard.dailySummary;
    const totalLogs = summary.feedings + summary.diaperChanges + Math.round(summary.sleepHours > 0 ? 1 : 0);

    if (totalLogs >= 3) {
      suggestions.push({
        id: `care-density-${this.selectedBabyId}-${summary.date}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.suggestions.care.title'),
        detail: this.i18n.translate('app.journey.suggestions.care.detail', {
          feedings: summary.feedings,
          diaperChanges: summary.diaperChanges,
          sleepHours: this.formatDecimal(summary.sleepHours)
        }),
        reason: this.i18n.translate('app.journey.suggestions.care.reason'),
        happenedAt: summary.lastUpdatedAt ?? new Date().toISOString(),
        type: 'CARE',
        confidence: this.clamp(64 + totalLogs * 7, 70, 96),
        icon: this.eventTypeConfig.CARE.icon,
        color: this.eventTypeConfig.CARE.color,
        saved: false
      });
    }

    const latestGrowth = this.growthRecords[0];
    const previousGrowth = this.growthRecords[1];
    if (latestGrowth) {
      const deltaWeight = latestGrowth.weightKg !== null && previousGrowth?.weightKg !== null && previousGrowth?.weightKg !== undefined
        ? latestGrowth.weightKg - previousGrowth.weightKg
        : null;
      const deltaWeightText = deltaWeight !== null
        ? this.i18n.translate('app.journey.suggestions.growth.deltaWeight', { deltaWeightKg: this.formatDecimal(deltaWeight) })
        : '';
      suggestions.push({
        id: `growth-${this.selectedBabyId}-${latestGrowth.id}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.suggestions.growth.title'),
        detail: this.i18n.translate('app.journey.suggestions.growth.detail', {
          weightKg: this.formatDecimal(latestGrowth.weightKg),
          heightCm: this.formatDecimal(latestGrowth.heightCm),
          deltaWeight: deltaWeightText
        }),
        reason: this.i18n.translate('app.journey.suggestions.growth.reason'),
        happenedAt: this.resolveDate(`${latestGrowth.measuredAt}T08:00:00`)?.toISOString() ?? new Date().toISOString(),
        type: 'GROWTH',
        confidence: previousGrowth ? 92 : 82,
        icon: this.eventTypeConfig.GROWTH.icon,
        color: this.eventTypeConfig.GROWTH.color,
        saved: false
      });
    }

    const nextVaccine = this.dashboard.vaccinationInsight.upcomingVaccinations[0] ?? this.vaccinations.find((item) => !item.completed);
    if (nextVaccine) {
      suggestions.push({
        id: `vaccine-${this.selectedBabyId}-${nextVaccine.id}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.suggestions.health.title', { vaccineName: nextVaccine.vaccineName }),
        detail: this.i18n.translate('app.journey.suggestions.health.detail', { dueDate: this.formatDate(nextVaccine.dueDate) }),
        reason: this.i18n.translate('app.journey.suggestions.health.reason'),
        happenedAt: this.resolveDate(`${nextVaccine.dueDate}T09:00:00`)?.toISOString() ?? new Date().toISOString(),
        type: 'HEALTH',
        confidence: this.dashboard.vaccinationInsight.overdueCount > 0 ? 95 : 84,
        icon: this.eventTypeConfig.HEALTH.icon,
        color: this.dashboard.vaccinationInsight.overdueCount > 0 ? 'red' : this.eventTypeConfig.HEALTH.color,
        saved: false
      });
    }

    const latestImage = this.galleryFiles[0];
    if (latestImage) {
      suggestions.push({
        id: `visual-${this.selectedBabyId}-${latestImage.id}`,
        babyId: this.selectedBabyId,
        title: this.i18n.translate('app.journey.suggestions.visual.title'),
        detail: this.i18n.translate('app.journey.suggestions.visual.detail', { fileName: latestImage.originalFileName }),
        reason: this.i18n.translate('app.journey.suggestions.visual.reason'),
        happenedAt: latestImage.createdAt,
        type: 'MEMORY',
        confidence: 78,
        icon: this.eventTypeConfig.MEMORY.icon,
        color: this.eventTypeConfig.MEMORY.color,
        saved: false
      });
    }

    suggestions.push({
      id: `family-voice-${this.selectedBabyId}-${this.todayKey()}`,
      babyId: this.selectedBabyId,
      title: this.i18n.translate('app.journey.suggestions.family.title'),
      detail: this.i18n.translate('app.journey.suggestions.family.detail'),
      reason: this.i18n.translate('app.journey.suggestions.family.reason'),
      happenedAt: new Date().toISOString(),
      type: 'FAMILY',
      confidence: 73,
      icon: this.eventTypeConfig.FAMILY.icon,
      color: this.eventTypeConfig.FAMILY.color,
      saved: false
    });

    return suggestions.map((suggestion) => ({
      ...suggestion,
      saved: savedRefs.has(suggestion.id)
    }));
  }

  private buildDnaLayers(storedEvents: JourneyEvent[]): JourneyDnaLayer[] {
    const careLogs = this.dashboard?.recentLogs.length ?? 0;
    const familyVoiceCount = storedEvents.filter((event) => event.type === 'FAMILY').length;
    const visualCount = this.galleryFiles.length + storedEvents.filter((event) => event.type === 'MEMORY').length;
    const capsuleCount = storedEvents.filter((event) => event.type === 'CAPSULE').length;

    return [
      {
        key: 'care',
        label: this.i18n.translate('app.journey.types.care'),
        value: careLogs,
        max: 12,
        meta: this.i18n.translate('app.journey.dnaLayers.care.meta', { count: careLogs }),
        icon: this.eventTypeConfig.CARE.icon,
        tone: 'teal'
      },
      {
        key: 'growth',
        label: this.i18n.translate('app.journey.types.growth'),
        value: this.growthRecords.length,
        max: 6,
        meta: this.i18n.translate('app.journey.dnaLayers.growth.meta', { count: this.growthRecords.length }),
        icon: this.eventTypeConfig.GROWTH.icon,
        tone: 'blue'
      },
      {
        key: 'voice',
        label: this.i18n.translate('app.journey.types.family'),
        value: familyVoiceCount,
        max: 5,
        meta: this.i18n.translate('app.journey.dnaLayers.voice.meta', { count: familyVoiceCount }),
        icon: this.eventTypeConfig.FAMILY.icon,
        tone: 'rose'
      },
      {
        key: 'visual',
        label: this.i18n.translate('app.journey.types.visual'),
        value: visualCount,
        max: 10,
        meta: this.i18n.translate('app.journey.dnaLayers.visual.meta', { count: visualCount }),
        icon: this.eventTypeConfig.MEMORY.icon,
        tone: 'gold'
      },
      {
        key: 'capsule',
        label: this.i18n.translate('app.journey.types.capsule'),
        value: capsuleCount,
        max: 4,
        meta: this.i18n.translate('app.journey.dnaLayers.capsule.meta', { count: capsuleCount }),
        icon: this.eventTypeConfig.CAPSULE.icon,
        tone: 'slate'
      }
    ];
  }

  private toEventView(event: JourneyEvent, persisted: boolean): JourneyEventView {
    const config = this.eventTypeConfig[event.type];
    const locked = event.type === 'CAPSULE' && !!event.capsuleOpenAt && Date.parse(event.capsuleOpenAt) > Date.now();
    return {
      ...event,
      icon: locked ? 'lock' : config.icon,
      color: locked ? 'gray' : config.color,
      typeLabel: this.eventTypeLabel(event.type),
      privacyLabel: this.privacyLabel(event.privacy),
      dateLabel: this.formatDateTime(event.happenedAt),
      displayStory: locked
        ? this.i18n.translate('app.journey.displayStory.lockedCapsule', {
            openAt: this.formatDateTime(event.capsuleOpenAt),
            recipient: event.recipient || this.selectedBaby?.name || 'be'
          })
        : event.story,
      persisted,
      locked,
      sourceLabel: this.sourceLabel(event.source)
    };
  }

  private sourceLabel(source: JourneyEventSource): string {
    if (source === 'AI') {
      return this.i18n.translate('app.journey.sources.ai');
    }
    if (source === 'SYSTEM') {
      return this.i18n.translate('app.journey.sources.system');
    }
    if (source === 'CAPSULE') {
      return this.i18n.translate('app.journey.sources.capsule');
    }
    return this.i18n.translate('app.journey.sources.family');
  }

  private belongsToSelectedBaby(event: JourneyEvent): boolean {
    return !!this.selectedBabyId && event.babyId === this.selectedBabyId;
  }

  private ensurePremiumAccess(): boolean {
    if (this.journeyPlusEnabled) {
      return true;
    }

    this.notification.warning('Journey+ Premium', this.i18n.translate('app.journey.notifications.premiumWarning'));
    return false;
  }

  private hasFeatureEnabled(features: ResolvedPremiumFeature[], featureKey: string): boolean {
    const matched = features.find((item) => item.featureKey === featureKey);
    return matched ? matched.enabled : false;
  }

  private resolveInitialBabyId(babies: BabyProfile[]): number | null {
    if (this.selectedBabyId && babies.some((baby) => baby.id === this.selectedBabyId)) {
      return this.selectedBabyId;
    }
    return babies[0]?.id ?? null;
  }

  private createId(_prefix?: string): string {
    return crypto.randomUUID();
  }

  private apiToEvent(api: JourneyEventApi): JourneyEvent {
    return {
      id: api.id,
      babyId: api.babyId,
      title: api.title,
      story: api.story ?? '',
      happenedAt: api.happenedAt,
      type: api.type as JourneyEventType,
      privacy: api.privacy as JourneyPrivacy,
      source: api.source as JourneyEventSource,
      sourceRef: api.sourceRef ?? undefined,
      capsuleOpenAt: api.capsuleOpenAt,
      recipient: api.recipient,
      createdAt: api.createdAt,
      createdBy: api.createdBy ?? 'Family'
    };
  }

  private resolveDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private defaultCapsuleOpenDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    date.setHours(9, 0, 0, 0);
    return date;
  }

  private todayKey(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private currentMonthKey(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private resolveLocale(): string {
    const lang = this.i18n.getCurrentLanguage();
    if (lang === 'en') return 'en-US';
    if (lang === 'ja') return 'ja-JP';
    if (lang === 'zh') return 'zh-CN';
    return 'vi-VN';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
