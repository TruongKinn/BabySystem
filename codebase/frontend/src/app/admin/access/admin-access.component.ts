import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
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
type RoleModalMode = 'create' | 'edit';

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

interface ApiAccessPermissionResponse {
  method: string;
  path: string;
}

interface UserAccessResponse {
  admin: boolean;
  roles: string[];
  menuKeys: string[];
  apiPermissions: ApiAccessPermissionResponse[];
}

@Component({
  selector: 'app-admin-access',
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
  templateUrl: './admin-access.component.html',
  styleUrl: './admin-access.component.css'
})
export class AdminAccessComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);

  loadingWorkspace = false;
  savingRole = false;
  deletingRoleId: number | null = null;
  loadingUserAccess = false;

  roles: RolePermissionResponse[] = [];
  filteredRoles: RolePermissionResponse[] = [];
  permissions: PermissionResponse[] = [];
  menuPermissions: PermissionResponse[] = [];
  apiPermissions: PermissionResponse[] = [];

  roleSearchText = '';
  selectedRoleId: number | null = null;

  isRoleModalVisible = false;
  roleModalMode: RoleModalMode = 'create';
  editingRoleId: number | null = null;
  roleName = '';
  selectedPermissionIds: number[] = [];

  accessLookupUserId = '';
  inspectedUserId: number | null = null;
  accessResult: UserAccessResponse | null = null;

  ngOnInit(): void {
    this.loadWorkspace();
  }

  get totalRoles(): number {
    return this.roles.length;
  }

  get totalMenuPermissions(): number {
    return this.menuPermissions.length;
  }

  get totalApiPermissions(): number {
    return this.apiPermissions.length;
  }

  get selectedRole(): RolePermissionResponse | null {
    if (this.selectedRoleId === null) {
      return null;
    }
    return this.roles.find((role) => role.id === this.selectedRoleId) ?? null;
  }

  get roleModalTitleKey(): string {
    return this.roleModalMode === 'create'
      ? 'momApp.admin.access.roleModal.createTitle'
      : 'momApp.admin.access.roleModal.editTitle';
  }

  get sortedSelectedMenuPermissions(): PermissionResponse[] {
    const selected = new Set(this.selectedPermissionIds);
    return this.menuPermissions.filter((permission) => selected.has(permission.id));
  }

  get sortedSelectedApiPermissions(): PermissionResponse[] {
    const selected = new Set(this.selectedPermissionIds);
    return this.apiPermissions.filter((permission) => selected.has(permission.id));
  }

  loadWorkspace(): void {
    this.loadingWorkspace = true;
    this.http.get<RolePermissionWorkspaceResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/workspace`).subscribe({
      next: (workspace) => {
        this.loadingWorkspace = false;

        const roles = [...(workspace.roles ?? [])].sort((left, right) => left.name.localeCompare(right.name));
        const menuPermissions = [...(workspace.menuPermissions ?? [])].sort((left, right) => left.name.localeCompare(right.name));
        const apiPermissions = [...(workspace.apiPermissions ?? [])].sort((left, right) => left.name.localeCompare(right.name));

        this.roles = roles;
        this.menuPermissions = menuPermissions;
        this.apiPermissions = apiPermissions;
        this.permissions = [...menuPermissions, ...apiPermissions];

        this.applyRoleSearch();
        this.syncSelectedRole();
      },
      error: () => {
        this.loadingWorkspace = false;
        this.roles = [];
        this.filteredRoles = [];
        this.permissions = [];
        this.menuPermissions = [];
        this.apiPermissions = [];
        this.selectedRoleId = null;
        this.selectedPermissionIds = [];
        this.message.error(this.i18n.translate('momApp.admin.access.messages.loadWorkspaceFailed'));
      }
    });
  }

  onRoleSearchChange(value: string): void {
    this.roleSearchText = value;
    this.applyRoleSearch();
  }

  selectRole(role: RolePermissionResponse): void {
    this.selectedRoleId = role.id;
    this.selectedPermissionIds = [...(role.permissionIds ?? [])];
  }

  openCreateRoleModal(): void {
    this.roleModalMode = 'create';
    this.editingRoleId = null;
    this.roleName = '';
    this.selectedPermissionIds = [];
    this.isRoleModalVisible = true;
  }

  openEditRoleModal(role: RolePermissionResponse): void {
    this.roleModalMode = 'edit';
    this.editingRoleId = role.id;
    this.roleName = role.name;
    this.selectedPermissionIds = [...(role.permissionIds ?? [])];
    this.selectedRoleId = role.id;
    this.isRoleModalVisible = true;
  }

  closeRoleModal(): void {
    this.isRoleModalVisible = false;
    this.roleModalMode = 'create';
    this.editingRoleId = null;
    this.roleName = '';
    this.selectedPermissionIds = [];
  }

  togglePermission(permissionId: number, checked: boolean): void {
    const selected = new Set(this.selectedPermissionIds);
    if (checked) {
      selected.add(permissionId);
    } else {
      selected.delete(permissionId);
    }
    this.selectedPermissionIds = Array.from(selected);
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissionIds.includes(permissionId);
  }

  saveRole(): void {
    const normalizedName = this.roleName.trim();
    if (!normalizedName) {
      this.message.warning(this.i18n.translate('momApp.admin.access.messages.roleNameRequired'));
      return;
    }

    this.savingRole = true;

    if (this.roleModalMode === 'create') {
      this.http
        .post<RolePermissionResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles`, {
          name: normalizedName,
          permissionIds: this.selectedPermissionIds
        })
        .subscribe({
          next: () => {
            this.savingRole = false;
            this.message.success(this.i18n.translate('momApp.admin.access.messages.createRoleSuccess'));
            this.closeRoleModal();
            this.loadWorkspace();
          },
          error: () => {
            this.savingRole = false;
            this.message.error(this.i18n.translate('momApp.admin.access.messages.createRoleFailed'));
          }
        });
      return;
    }

    if (this.editingRoleId === null) {
      this.savingRole = false;
      return;
    }

    const roleId = this.editingRoleId;
    forkJoin([
      this.http.put<RolePermissionResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/${roleId}`, {
        name: normalizedName
      }),
      this.http.put<RolePermissionResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/${roleId}/permissions`, {
        permissionIds: this.selectedPermissionIds
      })
    ]).subscribe({
      next: () => {
        this.savingRole = false;
        this.message.success(this.i18n.translate('momApp.admin.access.messages.updateRoleSuccess'));
        this.closeRoleModal();
        this.loadWorkspace();
      },
      error: () => {
        this.savingRole = false;
        this.message.error(this.i18n.translate('momApp.admin.access.messages.updateRoleFailed'));
      }
    });
  }

  deleteRole(role: RolePermissionResponse): void {
    this.deletingRoleId = role.id;
    this.http.delete<void>(`${API_CONFIG.GATEWAY_URL}/auth/roles/${role.id}`).subscribe({
      next: () => {
        this.deletingRoleId = null;
        this.message.success(this.i18n.translate('momApp.admin.access.messages.deleteRoleSuccess'));
        this.loadWorkspace();
      },
      error: () => {
        this.deletingRoleId = null;
        this.message.error(this.i18n.translate('momApp.admin.access.messages.deleteRoleFailed'));
      }
    });
  }

  inspectUserAccess(): void {
    const userId = Number(this.accessLookupUserId.trim());
    if (!Number.isInteger(userId) || userId <= 0) {
      this.message.warning(this.i18n.translate('momApp.admin.access.messages.invalidUserId'));
      return;
    }

    this.loadingUserAccess = true;
    this.http.get<UserAccessResponse>(`${API_CONFIG.GATEWAY_URL}/auth/roles/users/${userId}/access`).subscribe({
      next: (response) => {
        this.loadingUserAccess = false;
        this.inspectedUserId = userId;
        this.accessResult = {
          admin: response.admin ?? false,
          roles: [...(response.roles ?? [])],
          menuKeys: [...(response.menuKeys ?? [])],
          apiPermissions: [...(response.apiPermissions ?? [])]
        };
      },
      error: () => {
        this.loadingUserAccess = false;
        this.inspectedUserId = null;
        this.accessResult = null;
        this.message.error(this.i18n.translate('momApp.admin.access.messages.loadUserAccessFailed'));
      }
    });
  }

  permissionSummary(permission: PermissionResponse): string {
    if (permission.type === 'MENU') {
      return permission.menuKey || '-';
    }

    const method = permission.apiMethod || '-';
    const path = permission.apiPath || '-';
    return `${method} ${path}`;
  }

  trackByRole(_: number, role: RolePermissionResponse): number {
    return role.id;
  }

  trackByPermission(_: number, permission: PermissionResponse): number {
    return permission.id;
  }

  private applyRoleSearch(): void {
    const keyword = this.roleSearchText.trim().toLowerCase();
    if (!keyword) {
      this.filteredRoles = [...this.roles];
      return;
    }

    this.filteredRoles = this.roles.filter((role) => {
      const haystacks = [
        role.id.toString(),
        role.name,
        (role.permissionIds ?? []).join(',')
      ];
      return haystacks.some((value) => value.toLowerCase().includes(keyword));
    });
  }

  private syncSelectedRole(): void {
    if (!this.roles.length) {
      this.selectedRoleId = null;
      this.selectedPermissionIds = [];
      return;
    }

    const existing = this.selectedRoleId === null ? null : this.roles.find((role) => role.id === this.selectedRoleId);
    const targetRole = existing ?? this.roles[0];
    this.selectedRoleId = targetRole.id;
    this.selectedPermissionIds = [...(targetRole.permissionIds ?? [])];
  }
}
