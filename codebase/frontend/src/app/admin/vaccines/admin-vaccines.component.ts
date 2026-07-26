import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { I18nService } from '../../i18n/i18n.service';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Vaccine {
  id: number;
  name: string;
  manufacturer: string | null;
  diseasePrevented: string;
  totalDoses: number;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export interface VaccineScheduleConfig {
  id: number;
  doseNumber: number;
  recommendedAgeMonths: number;
  minDaysSincePreviousDose: number;
  createdAt: string;
}

@Component({
  selector: 'app-admin-vaccines',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzEmptyModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzFormModule
  ],
  templateUrl: './admin-vaccines.component.html',
  styleUrl: './admin-vaccines.component.css'
})
export class AdminVaccinesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);
  private readonly fb = inject(FormBuilder);

  vaccines: Vaccine[] = [];
  selectedVaccine: Vaccine | null = null;
  scheduleConfigs: VaccineScheduleConfig[] = [];

  isLoadingVaccines = false;
  isLoadingConfigs = false;
  isSubmittingVaccine = false;
  isSubmittingConfig = false;

  isVaccineModalVisible = false;
  isConfigModalVisible = false;
  modalMode: 'create' | 'edit' = 'create';

  readonly vaccineForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    manufacturer: ['', [Validators.maxLength(120)]],
    diseasePrevented: ['', [Validators.required, Validators.maxLength(255)]],
    totalDoses: [1, [Validators.required, Validators.min(1)]],
    description: ['']
  });

  readonly configForm = this.fb.group({
    doseNumber: [1, [Validators.required, Validators.min(1)]],
    recommendedAgeMonths: [0, [Validators.required, Validators.min(0)]],
    minDaysSincePreviousDose: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.loadVaccines();
  }

  loadVaccines(): void {
    this.isLoadingVaccines = true;
    this.http.get<ApiEnvelope<Vaccine[]>>('/api/vaccines?activeOnly=false')
      .subscribe({
        next: (res) => {
          this.vaccines = res.data || [];
          this.isLoadingVaccines = false;
        },
        error: (err) => {
          this.isLoadingVaccines = false;
          this.message.error(err?.message || this.i18n.translate('momApp.admin.vaccines.messages.loadFailed'));
        }
      });
  }

  selectVaccine(vaccine: Vaccine): void {
    this.selectedVaccine = vaccine;
    this.loadScheduleConfigs(vaccine.id);
  }

  loadScheduleConfigs(vaccineId: number): void {
    this.isLoadingConfigs = true;
    this.http.get<ApiEnvelope<VaccineScheduleConfig[]>>(`/api/vaccines/${vaccineId}/schedule-configs`)
      .subscribe({
        next: (res) => {
          this.scheduleConfigs = res.data || [];
          this.isLoadingConfigs = false;
        },
        error: (err) => {
          this.isLoadingConfigs = false;
          this.message.error(err?.message || this.i18n.translate('momApp.admin.vaccines.messages.loadConfigFailed'));
        }
      });
  }

  openCreateVaccineModal(): void {
    this.modalMode = 'create';
    this.vaccineForm.reset({
      name: '',
      manufacturer: '',
      diseasePrevented: '',
      totalDoses: 1,
      description: ''
    });
    this.isVaccineModalVisible = true;
  }

  openEditVaccineModal(vaccine: Vaccine): void {
    this.modalMode = 'edit';
    this.selectedVaccine = vaccine;
    this.vaccineForm.patchValue({
      name: vaccine.name,
      manufacturer: vaccine.manufacturer ?? '',
      diseasePrevented: vaccine.diseasePrevented,
      totalDoses: vaccine.totalDoses,
      description: vaccine.description ?? ''
    });
    this.isVaccineModalVisible = true;
  }

  closeVaccineModal(): void {
    this.isVaccineModalVisible = false;
  }

  submitVaccine(): void {
    if (this.vaccineForm.invalid) {
      this.vaccineForm.markAllAsTouched();
      return;
    }

    const payload = this.vaccineForm.value;
    this.isSubmittingVaccine = true;

    const request$ = this.modalMode === 'create'
      ? this.http.post<ApiEnvelope<Vaccine>>('/api/vaccines', payload)
      : this.http.put<ApiEnvelope<Vaccine>>(`/api/vaccines/${this.selectedVaccine?.id}`, payload);

    request$.subscribe({
      next: () => {
        this.isSubmittingVaccine = false;
        this.isVaccineModalVisible = false;
        this.loadVaccines();
        this.message.success(
          this.modalMode === 'create'
            ? this.i18n.translate('momApp.admin.vaccines.messages.createSuccess')
            : this.i18n.translate('momApp.admin.vaccines.messages.updateSuccess')
        );
      },
      error: (err) => {
        this.isSubmittingVaccine = false;
        this.message.error(err?.message || this.i18n.translate('momApp.admin.vaccines.messages.submitFailed'));
      }
    });
  }

  openCreateConfigModal(): void {
    if (!this.selectedVaccine) return;
    this.configForm.reset({
      doseNumber: this.scheduleConfigs.length + 1,
      recommendedAgeMonths: 0,
      minDaysSincePreviousDose: 0
    });
    this.isConfigModalVisible = true;
  }

  closeConfigModal(): void {
    this.isConfigModalVisible = false;
  }

  submitConfig(): void {
    if (this.configForm.invalid || !this.selectedVaccine) {
      this.configForm.markAllAsTouched();
      return;
    }

    const payload = this.configForm.value;
    this.isSubmittingConfig = true;

    this.http.post<ApiEnvelope<VaccineScheduleConfig>>(`/api/vaccines/${this.selectedVaccine.id}/schedule-configs`, payload)
      .subscribe({
        next: () => {
          this.isSubmittingConfig = false;
          this.isConfigModalVisible = false;
          this.loadScheduleConfigs(this.selectedVaccine!.id);
          this.message.success(this.i18n.translate('momApp.admin.vaccines.messages.createConfigSuccess'));
        },
        error: (err) => {
          this.isSubmittingConfig = false;
          this.message.error(err?.message || this.i18n.translate('momApp.admin.vaccines.messages.submitConfigFailed'));
        }
      });
  }
}
