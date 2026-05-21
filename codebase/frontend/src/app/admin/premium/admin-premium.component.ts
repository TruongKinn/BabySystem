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
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface FamilyMemberApi {
  userId: number;
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
  expiresAtInput: string;
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
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule
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

  families: FamilyOption[] = [];
  selectedFamilyId: number | null = null;

  premiumEntitlements: PremiumEntitlementView[] = [];
  premiumAudit: PremiumEntitlementAuditApi[] = [];

  readonly entitlementStatuses: PremiumEntitlementStatus[] = ['INHERIT', 'ALLOW', 'DENY'];

  ngOnInit(): void {
    this.loadFamilies();
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

        if (this.selectedFamilyId && this.families.some((family) => family.id === this.selectedFamilyId)) {
          this.loadPremiumConfig(this.selectedFamilyId);
          return;
        }

        this.selectedFamilyId = this.families[0]?.id ?? null;
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
        this.message.error(this.i18n.translate('momApp.admin.premium.messages.loadFamiliesFailed'));
      }
    });
  }

  onSelectedFamilyChange(familyId: number | null): void {
    this.selectedFamilyId = familyId;
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

  savePremiumConfig(): void {
    if (!this.selectedFamilyId || this.premiumEntitlements.length === 0) {
      return;
    }

    const payload = {
      entitlements: this.premiumEntitlements.map((item) => ({
        featureKey: item.featureKey,
        status: item.status,
        expiresAt: item.status === 'ALLOW' ? this.toIsoOffset(item.expiresAtInput) : null,
        reason: (item.reason ?? '').trim() || null
      }))
    };

    this.premiumSaving = true;
    this.http
      .put<ApiEnvelope<PremiumEntitlementApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamilyId}/entitlements`,
        payload
      )
      .subscribe({
        next: () => {
          this.premiumSaving = false;
          this.message.success(this.i18n.translate('momApp.admin.premium.messages.saveSuccess'));
          this.loadPremiumConfig(this.selectedFamilyId!);
        },
        error: (err) => {
          this.premiumSaving = false;
          const fallback = this.i18n.translate('momApp.admin.premium.messages.saveFailed');
          this.message.error(err?.error?.message || fallback);
        }
      });
  }

  onEntitlementStatusChange(item: PremiumEntitlementView): void {
    if (item.status !== 'ALLOW') {
      item.expiresAtInput = '';
    }
  }

  statusLabel(status: PremiumEntitlementStatus): string {
    return this.i18n.translate(`momApp.admin.premium.status.${status}`);
  }

  effectiveReasonLabel(reason: string): string {
    const key = `momApp.admin.premium.effectiveReason.${reason}`;
    const translated = this.i18n.translate(key);
    return translated === key ? reason : translated;
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
      return this.i18n.translate('momApp.common.notAvailable');
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

  private loadPremiumConfig(familyId: number): void {
    this.premiumLoading = true;

    forkJoin({
      entitlements: this.http.get<ApiEnvelope<PremiumEntitlementApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/entitlements`
      ),
      audit: this.http.get<ApiEnvelope<PremiumEntitlementAuditApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/entitlements/audit`
      )
    }).subscribe({
      next: ({ entitlements, audit }) => {
        this.premiumLoading = false;
        this.premiumEntitlements = (entitlements.data ?? []).map((item) => ({
          ...item,
          expiresAtInput: this.toDateTimeLocalInput(item.expiresAt)
        }));
        this.premiumAudit = (audit.data ?? []).slice(0, 20);
      },
      error: () => {
        this.premiumLoading = false;
        this.clearPremiumData();
        this.message.error(this.i18n.translate('momApp.admin.premium.messages.loadConfigFailed'));
      }
    });
  }

  private clearPremiumData(): void {
    this.premiumEntitlements = [];
    this.premiumAudit = [];
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

  private toIsoOffset(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      return null;
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  }
}
