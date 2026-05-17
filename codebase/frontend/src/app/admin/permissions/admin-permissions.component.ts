import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

type PermissionType = 'MENU' | 'API';
type PermissionFilterType = 'ALL' | PermissionType;
type PermissionModalMode = 'create' | 'edit';

interface PermissionResponse {
  id: number;
  name: string;
  description?: string | null;
  type: PermissionType;
  menuKey?: string | null;
  apiMethod?: string | null;
  apiPath?: string | null;
}

interface RolePermissionResponse {
  id: number;
  name: string;
  permissionIds: number[];
}

interface RolePermissionWorkspaceResponse {
  roles: RolePermissionResponse[];
  menuPermissions: PermissionResponse[];
  apiPermissions: PermissionResponse[];
}

interface MissingApiPermissionResponse {
  source: string;
  method: string;
  path: string;
  suggestedName: string;
  suggestedDescription: string;
}

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzTableModule,
    NzTagModule
  ],
  templateUrl: './admin-permissions.component.html',
  styleUrl: './admin-permissions.component.css'
})
export class AdminPermissionsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);

  loading = false;
  loadingMissingApis = false;
  savingPermission = false;
  deletingPermissionId: number | null = null;

  permissions: PermissionResponse[] = [];
  filteredPermissions: PermissionResponse[] = [];
  roles: RolePermissionResponse[] = [];
  missingApiPermissions: MissingApiPermissionResponse[] = [];

  searchText = '';
  filterType: PermissionFilterType = 'ALL';

  pageIndex = 1;
  pageSize = 12;

  isPermissionModalVisible = false;
  permissionModalMode: PermissionModalMode = 'create';
  editingPermissionId: number | null = null;

  permissionType: PermissionType = 'MENU';
  permissionName = '';
  permissionDescription = '';
  menuKey = '';
  apiMethod = 'GET';
  apiPath = '';

  ngOnInit(): void {
    this.refreshAll();
  }

  get totalPermissions(): number {
    return this.permissions.length;
  }

  get menuPermissionCount(): number {
    return this.permissions.filter((permission) => permission.type === 'MENU').length;
  }

  get apiPermissionCount(): number {
    return this.permissions.filter((permission) => permission.type === 'API').length;
  }

  get missingApiPermissionCount(): number {
    return this.missingApiPermissions.length;
  }

  get permissionModalTitleKey(): string {
    return this.permissionModalMode === 'create'
      ? 'momApp.admin.permissions.modal.createTitle'
      : 'momApp.admin.permissions.modal.editTitle';
  }

  get isCreateMode(): boolean {
    return this.permissionModalMode === 'create';
  }

  refreshAll(): void {
    this.loadWorkspace();
    this.loadMissingApiPermissions();
  }

  loadWorkspace(): void {
    this.loading = true;
    this.http.get<RolePermissionWorkspaceResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/workspace`).subscribe({
      next: (workspace) => {
        this.loading = false;

        const roles = [...(workspace.roles ?? [])].sort((left, right) => left.name.localeCompare(right.name));
        const menuPermissions = [...(workspace.menuPermissions ?? [])];
        const apiPermissions = [...(workspace.apiPermissions ?? [])];

        this.roles = roles;
        this.permissions = [...menuPermissions, ...apiPermissions].sort((left, right) => left.name.localeCompare(right.name));
        this.applyFilters();
      },
      error: () => {
        this.loading = false;
        this.permissions = [];
        this.filteredPermissions = [];
        this.roles = [];
        this.message.error(this.i18n.translate('momApp.admin.permissions.messages.loadFailed'));
      }
    });
  }

  loadMissingApiPermissions(): void {
    this.loadingMissingApis = true;
    this.http
      .get<MissingApiPermissionResponse[]>(`${API_CONFIG.GATEWAY_URL}/auth/roles/permissions/missing-apis`)
      .subscribe({
        next: (missingApis) => {
          this.loadingMissingApis = false;
          this.missingApiPermissions = [...(missingApis ?? [])];
        },
        error: () => {
          this.loadingMissingApis = false;
          this.missingApiPermissions = [];
          this.message.error(this.i18n.translate('momApp.admin.permissions.messages.loadMissingApiFailed'));
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.pageIndex = 1;
    this.applyFilters();
  }

  setFilterType(type: PermissionFilterType): void {
    this.filterType = type;
    this.pageIndex = 1;
    this.applyFilters();
  }

  openCreatePermissionModal(type: PermissionType): void {
    this.permissionModalMode = 'create';
    this.editingPermissionId = null;
    this.permissionType = type;
    this.permissionName = '';
    this.permissionDescription = '';
    this.menuKey = '';
    this.apiMethod = 'GET';
    this.apiPath = '';
    this.isPermissionModalVisible = true;
  }

  openEditPermissionModal(permission: PermissionResponse): void {
    this.permissionModalMode = 'edit';
    this.editingPermissionId = permission.id;
    this.permissionType = permission.type;
    this.permissionName = permission.name;
    this.permissionDescription = permission.description ?? '';
    this.menuKey = permission.menuKey ?? '';
    this.apiMethod = (permission.apiMethod ?? 'GET').toUpperCase();
    this.apiPath = permission.apiPath ?? '';
    this.isPermissionModalVisible = true;
  }

  closePermissionModal(): void {
    this.isPermissionModalVisible = false;
    this.permissionModalMode = 'create';
    this.editingPermissionId = null;
    this.permissionType = 'MENU';
    this.permissionName = '';
    this.permissionDescription = '';
    this.menuKey = '';
    this.apiMethod = 'GET';
    this.apiPath = '';
  }

  savePermission(): void {
    const normalizedName = this.permissionName.trim();
    if (!normalizedName) {
      this.message.warning(this.i18n.translate('momApp.admin.permissions.messages.nameRequired'));
      return;
    }

    if (this.permissionType === 'MENU' && !this.menuKey.trim()) {
      this.message.warning(this.i18n.translate('momApp.admin.permissions.messages.menuKeyRequired'));
      return;
    }

    if (this.permissionType === 'API' && (!this.apiMethod.trim() || !this.apiPath.trim())) {
      this.message.warning(this.i18n.translate('momApp.admin.permissions.messages.apiFieldRequired'));
      return;
    }

    this.savingPermission = true;

    if (this.permissionModalMode === 'create') {
      this.http
        .post<PermissionResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/permissions`, this.buildCreatePayload(normalizedName))
        .subscribe({
          next: () => {
            this.savingPermission = false;
            this.message.success(this.i18n.translate('momApp.admin.permissions.messages.createSuccess'));
            this.closePermissionModal();
            this.refreshAll();
          },
          error: () => {
            this.savingPermission = false;
            this.message.error(this.i18n.translate('momApp.admin.permissions.messages.createFailed'));
          }
        });
      return;
    }

    if (this.editingPermissionId === null) {
      this.savingPermission = false;
      return;
    }

    this.http
      .put<PermissionResponse>(
        `${API_CONFIG.GATEWAY_URL}/auth/roles/permissions/${this.editingPermissionId}`,
        this.buildUpdatePayload(normalizedName)
      )
      .subscribe({
        next: () => {
          this.savingPermission = false;
          this.message.success(this.i18n.translate('momApp.admin.permissions.messages.updateSuccess'));
          this.closePermissionModal();
          this.refreshAll();
        },
        error: () => {
          this.savingPermission = false;
          this.message.error(this.i18n.translate('momApp.admin.permissions.messages.updateFailed'));
        }
      });
  }

  deletePermission(permission: PermissionResponse): void {
    this.deletingPermissionId = permission.id;
    this.http.delete<void>(`${API_CONFIG.GATEWAY_URL}/auth/roles/permissions/${permission.id}`).subscribe({
      next: () => {
        this.deletingPermissionId = null;
        this.message.success(this.i18n.translate('momApp.admin.permissions.messages.deleteSuccess'));
        this.refreshAll();
      },
      error: () => {
        this.deletingPermissionId = null;
        this.message.error(this.i18n.translate('momApp.admin.permissions.messages.deleteFailed'));
      }
    });
  }

  typeLabel(type: PermissionType): string {
    return this.i18n.translate(`momApp.admin.permissions.types.${type.toLowerCase()}`);
  }

  permissionSummary(permission: PermissionResponse): string {
    if (permission.type === 'MENU') {
      return permission.menuKey || '-';
    }

    const method = permission.apiMethod || '-';
    const path = permission.apiPath || '-';
    return `${method} ${path}`;
  }

  usageCount(permissionId: number): number {
    return this.roles.filter((role) => (role.permissionIds ?? []).includes(permissionId)).length;
  }

  trackByPermission(_: number, permission: PermissionResponse): number {
    return permission.id;
  }

  openCreateApiPermissionFromSuggestion(candidate: MissingApiPermissionResponse): void {
    this.permissionModalMode = 'create';
    this.editingPermissionId = null;
    this.permissionType = 'API';
    this.permissionName = candidate.suggestedName;
    this.permissionDescription = candidate.suggestedDescription ?? '';
    this.menuKey = '';
    this.apiMethod = candidate.method;
    this.apiPath = candidate.path;
    this.isPermissionModalVisible = true;
  }

  private applyFilters(): void {
    const keyword = this.searchText.trim().toLowerCase();

    this.filteredPermissions = this.permissions.filter((permission) => {
      if (this.filterType !== 'ALL' && permission.type !== this.filterType) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystacks = [
        permission.id.toString(),
        permission.name,
        permission.description ?? '',
        permission.menuKey ?? '',
        permission.apiMethod ?? '',
        permission.apiPath ?? ''
      ];

      return haystacks.some((value) => value.toLowerCase().includes(keyword));
    });
  }

  private buildCreatePayload(name: string): Record<string, string> {
    if (this.permissionType === 'MENU') {
      return {
        name,
        description: this.nullable(this.permissionDescription),
        type: 'MENU',
        menuKey: this.menuKey.trim()
      };
    }

    return {
      name,
      description: this.nullable(this.permissionDescription),
      type: 'API',
      apiMethod: this.apiMethod.trim().toUpperCase(),
      apiPath: this.apiPath.trim()
    };
  }

  private buildUpdatePayload(name: string): Record<string, string> {
    if (this.permissionType === 'MENU') {
      return {
        name,
        description: this.nullable(this.permissionDescription),
        menuKey: this.menuKey.trim()
      };
    }

    return {
      name,
      description: this.nullable(this.permissionDescription),
      apiMethod: this.apiMethod.trim().toUpperCase(),
      apiPath: this.apiPath.trim()
    };
  }

  private nullable(value: string): string {
    return value.trim();
  }
}
