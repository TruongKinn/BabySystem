import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { catchError, forkJoin, map, of } from 'rxjs';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface FamilyMemberApi {
  userId: number;
  isHost?: boolean;
}

interface FamilyApi {
  id: number;
  name: string;
  members: FamilyMemberApi[];
}

interface FamilyOption {
  id: number;
  name: string;
  memberCount: number;
}

type PremiumEntitlementStatus = 'ALLOW' | 'DENY' | 'INHERIT';

interface PremiumEntitlementApi {
  featureKey: string;
  featureName: string;
  featureDescription: string;
  status: PremiumEntitlementStatus;
  expiresAt: string | null;
  reason: string | null;
  effectiveEnabled: boolean;
  effectiveReason: string;
}

interface PremiumEntitlementView extends PremiumEntitlementApi {
  expiresAtInput: Date | null;
}

interface PremiumEntitlementAuditApi {
  id: number;
  featureKey: string;
  oldStatus: PremiumEntitlementStatus | null;
  newStatus: PremiumEntitlementStatus;
  oldExpiresAt: string | null;
  newExpiresAt: string | null;
  reason: string | null;
  changedByUserId: number | null;
  changedAt: string;
}

interface AccountUserApi {
  id: number;
  username: string;
  email: string;
  displayName: string;
}

interface FamilyQuestStateApi {
  familyId: number;
  lastClaimDate: string | null;
  streakDays: number;
  totalPoints: number;
  claimedToday: boolean;
}

interface FamilyQuestPointGrantLogApi {
  id: number;
  points: number;
  reason: string | null;
  grantedByUserId: number | null;
  grantedAt: string;
}

interface GrantFamilyQuestPointsResponseApi {
  questState: FamilyQuestStateApi;
  grant: FamilyQuestPointGrantLogApi;
}

@Component({
  selector: 'app-admin-premium',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzDatePickerModule
  ],
  templateUrl: './admin-premium.component.html',
  styleUrl: './admin-premium.component.css'
})
export class AdminPremiumComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);

  loadingFamilies = false;
  premiumLoading = false;
  premiumSaving = false;
  bulkApplying = false;

  families: FamilyOption[] = [];
  selectedFamilyId: number | null = null;
  bulkTargetFamilyIds: number[] = [];

  premiumEntitlements: PremiumEntitlementView[] = [];
  premiumAudit: PremiumEntitlementAuditApi[] = [];
  auditUsersById: Record<number, AccountUserApi> = {};
  questState: FamilyQuestStateApi | null = null;
  questPointGrants: FamilyQuestPointGrantLogApi[] = [];
  questPointsGranting = false;
  questGrantPointsInput = 100;
  questGrantReasonInput = '';

  isAuditModalVisible = false;

  /**
   * Trạng thái hiển thị của Modal Lịch sử Cấp điểm (Quest Point Grants Log).
   * Hỗ trợ phân trang trực tiếp từ Backend để tối ưu hiệu năng.
   */
  isQuestGrantsModalVisible = false;
  questGrantsList: FamilyQuestPointGrantLogApi[] = [];
  questGrantsPage = 0;
  questGrantsSize = 10;
  questGrantsTotal = 0;
  questGrantsLoading = false;

  readonly entitlementStatuses: PremiumEntitlementStatus[] = ['INHERIT', 'ALLOW', 'DENY'];

  ngOnInit(): void {
    this.loadFamilies();
  }

  /**
   * Mở Modal Lịch sử Thay đổi Premium.
   * Chỉ kích hoạt từ thanh công cụ khi đã chọn một hộ gia đình cụ thể.
   */
  openAuditModal(): void {
    this.isAuditModalVisible = true;
  }

  /**
   * Đóng Modal Lịch sử Thay đổi Premium.
   */
  closeAuditModal(): void {
    this.isAuditModalVisible = false;
  }

  /**
   * Mở Modal Lịch sử Cấp điểm Quest.
   */
  openQuestGrantsModal(): void {
    if (!this.selectedFamilyId) {
      return;
    }
    this.isQuestGrantsModalVisible = true;
    this.questGrantsPage = 0;
    this.loadQuestGrantsPage();
  }

  /**
   * Đóng Modal Lịch sử Cấp điểm Quest.
   */
  closeQuestGrantsModal(): void {
    this.isQuestGrantsModalVisible = false;
  }

  /**
   * Tải trang Lịch sử Cấp điểm Quest từ Backend (BE).
   */
  loadQuestGrantsPage(): void {
    if (!this.selectedFamilyId) {
      return;
    }
    this.questGrantsLoading = true;
    const url = `${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamilyId}/quest-points/grants/page?page=${this.questGrantsPage}&size=${this.questGrantsSize}`;
    this.http.get<ApiEnvelope<{ page: number; size: number; total: number; items: FamilyQuestPointGrantLogApi[] }>>(url).subscribe({
      next: (response) => {
        this.questGrantsLoading = false;
        const pageResponse = response.data;
        this.questGrantsList = pageResponse?.items ?? [];
        this.questGrantsTotal = pageResponse?.total ?? 0;

        // Tải thêm thông tin tài khoản của người thực hiện cấp điểm
        const actorIds = [...new Set(this.questGrantsList.map((row) => row.grantedByUserId))].filter(
          (id): id is number => !!id && id > 0
        );
        if (actorIds.length > 0) {
          this.loadAdditionalActorUsers(actorIds);
        }
      },
      error: () => {
        this.questGrantsLoading = false;
        this.questGrantsList = [];
        this.questGrantsTotal = 0;
        this.message.error(this.i18n.translate('admin.premium.questPoints.messages.loadFailed'));
      }
    });
  }

  /**
   * Tải thêm thông tin người dùng nếu chưa có sẵn trong cache
   */
  private loadAdditionalActorUsers(actorIds: number[]): void {
    const missingIds = actorIds.filter((id) => !this.auditUsersById[id]);
    if (missingIds.length === 0) {
      return;
    }

    forkJoin(
      missingIds.map((userId) =>
        this.http
          .get<ApiEnvelope<AccountUserApi>>(`${API_CONFIG.GATEWAY_URL}/account/users/${userId}`)
          .pipe(
            map((response) => response.data),
            catchError(() => of(null))
          )
      )
    ).subscribe((users) => {
      const updated = { ...this.auditUsersById };
      for (const user of users) {
        if (user?.id) {
          updated[user.id] = user;
        }
      }
      this.auditUsersById = updated;
    });
  }

  /**
   * Xử lý thay đổi số trang trong nz-table.
   */
  onQuestGrantsPageChange(pageIndex: number): void {
    this.questGrantsPage = pageIndex - 1;
    this.loadQuestGrantsPage();
  }

  /**
   * Xử lý thay đổi kích thước trang trong nz-table.
   */
  onQuestGrantsSizeChange(pageSize: number): void {
    this.questGrantsSize = pageSize;
    this.questGrantsPage = 0;
    this.loadQuestGrantsPage();
  }

  get selectedFamily(): FamilyOption | null {
    if (this.selectedFamilyId === null) {
      return null;
    }
    return this.families.find((family) => family.id === this.selectedFamilyId) ?? null;
  }

  get enabledFeatureCount(): number {
    return this.premiumEntitlements.filter((item) => item.effectiveEnabled).length;
  }

  get bulkFamilyOptions(): FamilyOption[] {
    return this.families.filter((family) => family.id !== this.selectedFamilyId);
  }

  get canApplyBulkConfig(): boolean {
    return this.bulkTargetFamilyIds.length > 0 && this.premiumEntitlements.length > 0 && !this.bulkApplying;
  }

  get totalQuestPoints(): number {
    return Math.max(0, Math.trunc(Number(this.questState?.totalPoints ?? 0)));
  }

  get canGrantQuestPoints(): boolean {
    const points = Math.trunc(Number(this.questGrantPointsInput));
    return !!this.selectedFamilyId && points > 0 && !this.questPointsGranting;
  }

  trackByFamily(_: number, family: FamilyOption): number {
    return family.id;
  }

  loadFamilies(): void {
    this.loadingFamilies = true;
    this.http.get<ApiEnvelope<FamilyApi[]>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`).subscribe({
      next: (response) => {
        this.loadingFamilies = false;
        this.families = [...(response.data ?? [])]
          .map((family) => ({
            id: family.id,
            name: family.name,
            memberCount: family.members?.length ?? 0
          }))
          .sort((left, right) => left.name.localeCompare(right.name));

        this.bulkTargetFamilyIds = this.bulkTargetFamilyIds.filter((familyId) =>
          this.families.some((family) => family.id === familyId)
        );

        if (this.selectedFamilyId && this.families.some((family) => family.id === this.selectedFamilyId)) {
          this.bulkTargetFamilyIds = this.bulkTargetFamilyIds.filter((familyId) => familyId !== this.selectedFamilyId);
          this.loadPremiumConfig(this.selectedFamilyId);
          return;
        }

        this.selectedFamilyId = this.families[0]?.id ?? null;
        this.bulkTargetFamilyIds = this.bulkTargetFamilyIds.filter((familyId) => familyId !== this.selectedFamilyId);
        if (this.selectedFamilyId) {
          this.loadPremiumConfig(this.selectedFamilyId);
        } else {
          this.clearPremiumData();
        }
      },
      error: () => {
        this.loadingFamilies = false;
        this.families = [];
        this.selectedFamilyId = null;
        this.clearPremiumData();
        this.message.error(this.i18n.translate('admin.premium.messages.loadFamiliesFailed'));
      }
    });
  }

  onSelectedFamilyChange(familyId: number | null): void {
    this.selectedFamilyId = familyId;
    this.bulkTargetFamilyIds = this.bulkTargetFamilyIds.filter((id) => id !== familyId);
    if (!familyId) {
      this.clearPremiumData();
      return;
    }
    this.loadPremiumConfig(familyId);
  }

  refreshSelectedFamilyConfig(): void {
    if (!this.selectedFamilyId) {
      return;
    }
    this.loadPremiumConfig(this.selectedFamilyId);
  }

  grantQuestPoints(): void {
    if (!this.selectedFamilyId) {
      return;
    }

    const points = Math.trunc(Number(this.questGrantPointsInput));
    if (!Number.isFinite(points) || points <= 0) {
      this.message.warning(this.i18n.translate('admin.premium.questPoints.messages.invalidPoints'));
      return;
    }

    this.questPointsGranting = true;
    this.http
      .post<ApiEnvelope<GrantFamilyQuestPointsResponseApi>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamilyId}/quest-points/grant`,
        {
          points,
          reason: (this.questGrantReasonInput ?? '').trim() || null
        }
      )
      .subscribe({
        next: () => {
          this.questPointsGranting = false;
          this.questGrantReasonInput = '';
          this.message.success(this.i18n.translate('admin.premium.questPoints.messages.grantSuccess', { points }));
          this.loadPremiumConfig(this.selectedFamilyId!);
          if (this.isQuestGrantsModalVisible) {
            this.questGrantsPage = 0;
            this.loadQuestGrantsPage();
          }
        },
        error: (err) => {
          this.questPointsGranting = false;
          const fallback = this.i18n.translate('admin.premium.questPoints.messages.grantFailed');
          this.message.error(err?.error?.message || fallback);
        }
      });
  }

  savePremiumConfig(): void {
    if (!this.selectedFamilyId || this.premiumEntitlements.length === 0) {
      return;
    }

    const payload = this.buildEntitlementPayload();

    this.premiumSaving = true;
    this.http
      .put<ApiEnvelope<PremiumEntitlementApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamilyId}/entitlements`,
        payload
      )
      .subscribe({
        next: () => {
          this.premiumSaving = false;
          this.message.success(this.i18n.translate('admin.premium.messages.saveSuccess'));
          this.loadPremiumConfig(this.selectedFamilyId!);
        },
        error: (err) => {
          this.premiumSaving = false;
          const fallback = this.i18n.translate('admin.premium.messages.saveFailed');
          this.message.error(err?.error?.message || fallback);
        }
      });
  }

  applyBulkPremiumConfig(): void {
    if (!this.canApplyBulkConfig) {
      return;
    }

    const payload = this.buildEntitlementPayload();
    const targetFamilyIds = [...new Set(this.bulkTargetFamilyIds)]
      .filter((familyId) => familyId !== this.selectedFamilyId)
      .sort((left, right) => left - right);

    if (targetFamilyIds.length === 0) {
      this.message.warning(this.i18n.translate('admin.premium.messages.bulkTargetRequired'));
      return;
    }

    this.bulkApplying = true;
    forkJoin(
      targetFamilyIds.map((familyId) =>
        this.http
          .put<ApiEnvelope<PremiumEntitlementApi[]>>(
            `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/entitlements`,
            payload
          )
          .pipe(
            map(() => ({ familyId, success: true as const })),
            catchError((err) =>
              of({
                familyId,
                success: false as const,
                message: err?.error?.message || err?.message || ''
              })
            )
          )
      )
    ).subscribe({
      next: (results) => {
        this.bulkApplying = false;
        const successCount = results.filter((result) => result.success).length;
        const failed = results.filter((result) => !result.success);

        if (failed.length === 0) {
          this.message.success(
            this.i18n.translate('admin.premium.messages.bulkApplySuccess', { count: successCount })
          );
          return;
        }

        if (successCount > 0) {
          const failedIds = failed.map((result) => `#${result.familyId}`).join(', ');
          this.message.warning(
            this.i18n.translate('admin.premium.messages.bulkApplyPartial', {
              success: successCount,
              failed: failedIds
            })
          );
          return;
        }

        const firstError = failed[0]?.message || this.i18n.translate('admin.premium.messages.bulkApplyFailed');
        this.message.error(firstError);
      },
      error: () => {
        this.bulkApplying = false;
        this.message.error(this.i18n.translate('admin.premium.messages.bulkApplyFailed'));
      }
    });
  }

  onEntitlementStatusChange(item: PremiumEntitlementView): void {
    if (item.status !== 'ALLOW') {
      item.expiresAtInput = null;
    }
  }

  statusLabel(status: PremiumEntitlementStatus): string {
    return this.i18n.translate(`admin.premium.status.${status}`);
  }

  effectiveReasonLabel(reason: string): string {
    const key = `admin.premium.effectiveReason.${reason}`;
    const translated = this.i18n.translate(key);
    return translated === key ? reason : translated;
  }

  featureName(featureKey: string, fallback: string): string {
    const key = `admin.premium.features.${featureKey}.name`;
    const translated = this.i18n.translate(key);
    return translated === key ? fallback : translated;
  }

  featureDescription(featureKey: string, fallback: string): string {
    const key = `admin.premium.features.${featureKey}.description`;
    const translated = this.i18n.translate(key);
    return translated === key ? (fallback || '') : translated;
  }

  effectiveTagColor(item: PremiumEntitlementView): string {
    if (item.effectiveEnabled) {
      return 'green';
    }
    if (item.effectiveReason === 'DENY') {
      return 'red';
    }
    if (item.effectiveReason === 'EXPIRED') {
      return 'orange';
    }
    return 'default';
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value?.trim()) {
      return this.i18n.translate('commonValues.na');
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    const locale = this.i18n.getCurrentLanguage() === 'vi' ? 'vi-VN' : 'en-US';
    return parsed.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  changedByDisplay(row: PremiumEntitlementAuditApi): string {
    if (!row.changedByUserId) {
      return this.i18n.translate('commonValues.na');
    }

    const actor = this.auditUsersById[row.changedByUserId];
    if (!actor) {
      return `#${row.changedByUserId}`;
    }

    const displayName = actor.displayName?.trim();
    const username = actor.username?.trim();
    if (displayName && username) {
      return `${displayName} (@${username})`;
    }
    return displayName || username || `#${row.changedByUserId}`;
  }

  changedByMeta(row: PremiumEntitlementAuditApi): string {
    if (!row.changedByUserId) {
      return '';
    }

    const actor = this.auditUsersById[row.changedByUserId];
    if (!actor) {
      return `ID #${row.changedByUserId}`;
    }

    const email = actor.email?.trim();
    return email ? `${email} · ID #${row.changedByUserId}` : `ID #${row.changedByUserId}`;
  }

  questGrantByDisplay(row: FamilyQuestPointGrantLogApi): string {
    if (!row.grantedByUserId) {
      return this.i18n.translate('commonValues.na');
    }

    const actor = this.auditUsersById[row.grantedByUserId];
    if (!actor) {
      return `#${row.grantedByUserId}`;
    }

    const displayName = actor.displayName?.trim();
    const username = actor.username?.trim();
    if (displayName && username) {
      return `${displayName} (@${username})`;
    }
    return displayName || username || `#${row.grantedByUserId}`;
  }

  questGrantByMeta(row: FamilyQuestPointGrantLogApi): string {
    if (!row.grantedByUserId) {
      return '';
    }

    const actor = this.auditUsersById[row.grantedByUserId];
    if (!actor) {
      return `ID #${row.grantedByUserId}`;
    }

    const email = actor.email?.trim();
    return email ? `${email} · ID #${row.grantedByUserId}` : `ID #${row.grantedByUserId}`;
  }

  private loadPremiumConfig(familyId: number): void {
    this.premiumLoading = true;

    forkJoin({
      entitlements: this.http.get<ApiEnvelope<PremiumEntitlementApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/entitlements`
      ),
      audit: this.http.get<ApiEnvelope<PremiumEntitlementAuditApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/entitlements/audit`
      ),
      questState: this.http.get<ApiEnvelope<FamilyQuestStateApi>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/quest-state`
      )
    }).subscribe({
      next: ({ entitlements, audit, questState }) => {
        this.premiumLoading = false;
        this.premiumEntitlements = (entitlements.data ?? []).map((item) => ({
          ...item,
          expiresAtInput: item.expiresAt ? new Date(item.expiresAt) : null
        }));
        this.premiumAudit = (audit.data ?? []).slice(0, 20);
        this.questState = questState.data ?? null;
        this.questPointGrants = [];
        const actorIds = [
          ...new Set([
            ...this.premiumAudit.map((row) => row.changedByUserId)
          ])
        ].filter((id): id is number => !!id && id > 0);
        this.loadActorUsers(actorIds);
      },
      error: () => {
        this.premiumLoading = false;
        this.clearPremiumData();
        this.message.error(this.i18n.translate('admin.premium.messages.loadConfigFailed'));
      }
    });
  }

  private clearPremiumData(): void {
    this.premiumEntitlements = [];
    this.premiumAudit = [];
    this.questState = null;
    this.questPointGrants = [];
    this.questGrantPointsInput = 100;
    this.questGrantReasonInput = '';
    this.auditUsersById = {};
  }

  private loadActorUsers(actorIds: number[]): void {
    if (actorIds.length === 0) {
      this.auditUsersById = {};
      return;
    }

    forkJoin(
      actorIds.map((userId) =>
        this.http
          .get<ApiEnvelope<AccountUserApi>>(`${API_CONFIG.GATEWAY_URL}/account/users/${userId}`)
          .pipe(
            map((response) => response.data),
            catchError(() => of(null))
          )
      )
    ).subscribe((users) => {
      const mapped: Record<number, AccountUserApi> = {};
      for (const user of users) {
        if (user?.id) {
          mapped[user.id] = user;
        }
      }
      this.auditUsersById = mapped;
    });
  }

  private buildEntitlementPayload(): { entitlements: Array<{
    featureKey: string;
    status: PremiumEntitlementStatus;
    expiresAt: string | null;
    reason: string | null;
  }> } {
    return {
      entitlements: this.premiumEntitlements.map((item) => ({
        featureKey: item.featureKey,
        status: item.status,
        expiresAt: item.status === 'ALLOW' ? this.toIsoOffset(item.expiresAtInput) : null,
        reason: (item.reason ?? '').trim() || null
      }))
    };
  }

  private toDateTimeLocalInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private toIsoOffset(value: any): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }
}

