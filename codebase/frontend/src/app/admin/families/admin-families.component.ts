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
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../auth/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { API_CONFIG } from '../../shared/constants/api.constant';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface FamilyMemberApi {
  userId: number;
  displayName: string;
  role: string;
  relation: string;
  parentUserId: number | null;
  dateOfBirth?: string | null;
  isHost?: boolean;
}

interface FamilyApi {
  id: number;
  name: string;
  createdByUserId: number;
  members: FamilyMemberApi[];
}

interface FamilyTreeNode {
  key: string;
  member: FamilyMemberApi;
  children: FamilyTreeNode[];
}

interface FamilyView extends FamilyApi {
  creatorName: string;
  memberCount: number;
  tree: FamilyTreeNode[];
}

interface UpcomingBirthdayApi {
  userId: number;
  displayName: string;
  role: string;
  relation: string;
  dateOfBirth: string;
  nextBirthday: string;
  daysUntilBirthday: number;
  turningAge: number;
}

@Component({
  selector: 'app-admin-families',
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
    NzSelectModule,
    NzTableModule,
    NzDividerModule,
    NzTagModule,
    NzSpinModule,
    NzTabsModule,
    NzToolTipModule,
    NzIconModule
  ],
  templateUrl: './admin-families.component.html',
  styleUrl: './admin-families.component.css'
})
export class AdminFamiliesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly i18n = inject(I18nService);
  private readonly authService = inject(AuthService);

  loading = false;
  submitting = false;
  deletingFamilyId: number | null = null;
  searchText = '';
  families: FamilyView[] = [];
  filteredFamilies: FamilyView[] = [];
  editingFamily: FamilyView | null = null;
  editFamilyName = '';
  createFamilyName = '';
  isCreateModalVisible = false;
  isEditModalVisible = false;

  // Trạng thái modal Quản lý thành viên
  isManageMembersModalVisible = false;
  selectedFamily: FamilyView | null = null;
  membersLoading = false;
  upcomingBirthdays: UpcomingBirthdayApi[] = [];
  upcomingBirthdaysLoading = false;

  // Form Thêm thành viên
  lookupKeyword = '';
  foundUser: { id: number; username: string; email: string; displayName: string } | null = null;
  lookupLoading = false;
  newMemberRole: string = 'CAREGIVER';
  newMemberRelation: string = 'THANH_VIEN_KHAC';
  newMemberParentId: number | null = null;
  newMemberDateOfBirth = '';
  addingMember = false;

  // Form Tạo mới thành viên
  newMemberDisplayName = '';
  newMemberUsername = '';
  newMemberEmail = '';

  // Inline Sửa thành viên
  editingMemberId: number | null = null;
  editingMemberDisplayName = '';
  editingMemberUsername = '';
  editingMemberEmail = '';
  editingMemberDateOfBirth = '';
  editingMemberRole = '';
  editingMemberRelation = '';
  editingMemberParentId: number | null = null;
  savingMember = false;

  // Xóa thành viên
  removingMemberId: number | null = null;

  // Các danh sách hỗ trợ Dropdown
  rolesList = ['MOM', 'DAD', 'GRANDMA', 'CAREGIVER'];
  relationsList = [
    'ONG_NOI', 'BA_NOI', 'ONG_NGOAI', 'BA_NGOAI', 'BO', 'ME',
    'ANH_TRAI', 'CHI_GAI', 'EM_TRAI', 'EM_GAI', 'CON_TRAI', 'CON_GAI',
    'CHU', 'BAC', 'CO', 'DI', 'CAU', 'MO', 'THIM', 'BAO_MAU', 'THANH_VIEN_KHAC'
  ];

  ngOnInit(): void {
    this.loadFamilies();
  }

  loadFamilies(): void {
    this.loading = true;
    this.http.get<ApiEnvelope<FamilyApi[]>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`).subscribe({
      next: (response) => {
        const rawFamilies = response.data ?? [];
        this.families = rawFamilies.map((family) => {
          const members = [...(family.members ?? [])];
          const creator = members.find((member) => member.userId === family.createdByUserId);

          return {
            ...family,
            members,
            creatorName: creator?.displayName ?? `#${family.createdByUserId}`,
            memberCount: members.length,
            tree: this.buildFamilyTree(members)
          };
        });
        this.loading = false;
        this.applySearch();
      },
      error: () => {
        this.loading = false;
        this.families = [];
        this.filteredFamilies = [];
        this.message.error(this.i18n.translate('momApp.admin.families.messages.loadFailed'));
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.applySearch();
  }

  roleLabel(role: string): string {
    const normalized = (role || '').toUpperCase();
    const roleKey = `momApp.family.role.${normalized}`;
    const translated = this.i18n.translate(roleKey);
    if (translated !== roleKey) {
      return translated;
    }
    return this.i18n.translate('momApp.admin.families.role.member');
  }

  relationLabel(value: string): string {
    if (!value) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const key = `momApp.family.relation.${value}`;
    const translated = this.i18n.translate(key);
    if (translated !== key) {
      return translated;
    }

    return value.replace(/_/g, ' ');
  }

  roleClass(role: string): string {
    const normalized = (role || '').toUpperCase();
    if (normalized === 'MOM') {
      return 'role-mom';
    }
    if (normalized === 'DAD') {
      return 'role-dad';
    }
    if (normalized === 'GRANDMA') {
      return 'role-grandma';
    }
    if (normalized === 'CAREGIVER') {
      return 'role-caregiver';
    }
    return 'role-member';
  }

  trackByFamily(_: number, family: FamilyView): number {
    return family.id;
  }

  trackByTreeNode(_: number, node: FamilyTreeNode): string {
    return node.key;
  }

  openCreateFamilyModal(): void {
    this.createFamilyName = '';
    this.isCreateModalVisible = true;
  }

  closeCreateFamilyModal(): void {
    this.isCreateModalVisible = false;
    this.createFamilyName = '';
  }

  submitCreateFamily(): void {
    const name = this.createFamilyName.trim();
    if (!name) {
      this.message.warning(this.i18n.translate('momApp.admin.families.messages.nameRequired'));
      return;
    }

    const createdByUserId = this.getCurrentUserId();
    if (!createdByUserId) {
      this.message.error(this.i18n.translate('momApp.admin.families.messages.creatorRequired'));
      return;
    }

    this.submitting = true;
    this.http
      .post<ApiEnvelope<FamilyApi>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families`, { name, createdByUserId })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.message.success(this.i18n.translate('momApp.admin.families.messages.createSuccess'));
          this.closeCreateFamilyModal();
          this.loadFamilies();
        },
        error: () => {
          this.submitting = false;
          this.message.error(this.i18n.translate('momApp.admin.families.messages.createFailed'));
        }
      });
  }

  openEditFamilyModal(family: FamilyView): void {
    this.editingFamily = family;
    this.editFamilyName = family.name;
    this.isEditModalVisible = true;
  }

  closeEditFamilyModal(): void {
    this.isEditModalVisible = false;
    this.editingFamily = null;
    this.editFamilyName = '';
  }

  submitEditFamily(): void {
    if (!this.editingFamily) {
      return;
    }

    const nextName = this.editFamilyName.trim();
    if (!nextName) {
      this.message.warning(this.i18n.translate('momApp.admin.families.messages.nameRequired'));
      return;
    }

    this.submitting = true;
    this.http
      .put<ApiEnvelope<FamilyApi>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.editingFamily.id}`, { name: nextName })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.message.success(this.i18n.translate('momApp.admin.families.messages.updateSuccess'));
          this.closeEditFamilyModal();
          this.loadFamilies();
        },
        error: () => {
          this.submitting = false;
          this.message.error(this.i18n.translate('momApp.admin.families.messages.updateFailed'));
        }
      });
  }

  deleteFamily(family: FamilyView): void {
    this.deletingFamilyId = family.id;
    this.http.delete<ApiEnvelope<void>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${family.id}`).subscribe({
      next: () => {
        this.deletingFamilyId = null;
        this.message.success(this.i18n.translate('momApp.admin.families.messages.deleteSuccess'));
        this.loadFamilies();
      },
      error: () => {
        this.deletingFamilyId = null;
        this.message.error(this.i18n.translate('momApp.admin.families.messages.deleteFailed'));
      }
    });
  }

  private applySearch(): void {
    const keyword = this.searchText.trim().toLowerCase();
    if (!keyword) {
      this.filteredFamilies = [...this.families];
      return;
    }

    this.filteredFamilies = this.families.filter((family) => {
      const familyText = `${family.id} ${family.name} ${family.creatorName}`.toLowerCase();
      if (familyText.includes(keyword)) {
        return true;
      }

      return (family.members ?? []).some((member) => {
        const memberText = `${member.displayName} ${member.role} ${member.relation ?? ''}`.toLowerCase();
        return memberText.includes(keyword);
      });
    });
  }

  private buildFamilyTree(members: FamilyMemberApi[]): FamilyTreeNode[] {
    const byUserId = new Map<number, FamilyMemberApi>();
    members.forEach((member) => byUserId.set(member.userId, member));

    const childrenByParent = new Map<number | null, FamilyMemberApi[]>();
    members.forEach((member) => {
      const hasParent = member.parentUserId !== null && byUserId.has(member.parentUserId);
      const parentKey = hasParent ? member.parentUserId : null;
      const bucket = childrenByParent.get(parentKey) ?? [];
      bucket.push(member);
      childrenByParent.set(parentKey, bucket);
    });

    for (const [key, value] of childrenByParent) {
      childrenByParent.set(key, value.sort((a, b) => this.compareMembers(a, b)));
    }

    const visited = new Set<number>();
    const buildNode = (member: FamilyMemberApi, path: string): FamilyTreeNode => {
      if (visited.has(member.userId)) {
        return {
          key: `${member.userId}:${path}`,
          member,
          children: []
        };
      }
      visited.add(member.userId);

      const children = (childrenByParent.get(member.userId) ?? [])
        .filter((child) => child.userId !== member.userId)
        .map((child, index) => buildNode(child, `${path}.${index}`));

      return {
        key: `${member.userId}:${path}`,
        member,
        children
      };
    };

    const roots = (childrenByParent.get(null) ?? []).map((root, index) => buildNode(root, `root.${index}`));

    for (const member of members.sort((a, b) => this.compareMembers(a, b))) {
      if (!visited.has(member.userId)) {
        roots.push(buildNode(member, `orphan.${member.userId}`));
      }
    }

    return roots;
  }

  private compareMembers(a: FamilyMemberApi, b: FamilyMemberApi): number {
    const relOrder = this.relationWeight(a.relation) - this.relationWeight(b.relation);
    if (relOrder !== 0) {
      return relOrder;
    }

    const roleOrder = this.roleWeight(a.role) - this.roleWeight(b.role);
    if (roleOrder !== 0) {
      return roleOrder;
    }
    return (a.displayName || '').localeCompare(b.displayName || '');
  }

  private relationWeight(relation: string): number {
    const norm = (relation || '').toUpperCase();
    // Thế hệ Ông Bà
    if (norm === 'ONG_NOI') return 1;
    if (norm === 'BA_NOI') return 2;
    if (norm === 'ONG_NGOAI') return 3;
    if (norm === 'BA_NGOAI') return 4;

    // Thế hệ Bố Mẹ
    if (norm === 'BO') return 10;
    if (norm === 'ME') return 11;

    // Bậc Cô, Dì, Chú, Bác
    if (norm === 'BAC') return 20;
    if (norm === 'CHU') return 21;
    if (norm === 'CO') return 22;
    if (norm === 'CAU') return 23;
    if (norm === 'DI') return 24;
    if (norm === 'MO') return 25;
    if (norm === 'THIM') return 26;

    // Thế hệ Anh, Chị, Em
    if (norm === 'ANH_TRAI') return 30;
    if (norm === 'CHI_GAI') return 31;
    if (norm === 'EM_TRAI') return 32;
    if (norm === 'EM_GAI') return 33;

    // Hậu duệ
    if (norm === 'CON_TRAI') return 40;
    if (norm === 'CON_GAI') return 41;

    // Khác
    if (norm === 'BAO_MAU') return 50;

    return 99; // THANH_VIEN_KHAC or others
  }

  private roleWeight(role: string): number {
    const normalized = (role || '').toUpperCase();
    if (normalized === 'MOM') {
      return 1;
    }
    if (normalized === 'DAD') {
      return 2;
    }
    if (normalized === 'GRANDMA') {
      return 3;
    }
    if (normalized === 'CAREGIVER') {
      return 4;
    }
    return 9;
  }

  openManageMembersModal(family: FamilyView): void {
    this.selectedFamily = family;
    this.isManageMembersModalVisible = true;
    this.resetAddMemberForm();
    this.cancelEditMember();
    this.loadUpcomingBirthdays(family.id);
  }

  closeManageMembersModal(): void {
    this.isManageMembersModalVisible = false;
    this.selectedFamily = null;
    this.resetAddMemberForm();
    this.cancelEditMember();
    this.upcomingBirthdays = [];
    this.upcomingBirthdaysLoading = false;
  }

  resetAddMemberForm(): void {
    this.lookupKeyword = '';
    this.foundUser = null;
    this.newMemberRole = 'CAREGIVER';
    this.newMemberRelation = 'THANH_VIEN_KHAC';
    this.newMemberParentId = null;
    this.newMemberDateOfBirth = '';
    this.newMemberDisplayName = '';
    this.newMemberUsername = '';
    this.newMemberEmail = '';
  }

  lookupUser(): void {
    const keyword = this.lookupKeyword.trim();
    if (!keyword) {
      this.message.warning(this.i18n.translate('momApp.admin.families.messages.searchKeywordRequired') || 'Vui lòng nhập Username hoặc Email');
      return;
    }

    this.lookupLoading = true;
    this.foundUser = null;

    const isEmail = keyword.includes('@');
    const params = isEmail ? `email=${encodeURIComponent(keyword)}` : `username=${encodeURIComponent(keyword)}`;

    this.http.get<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/users/lookup?${params}`).subscribe({
      next: (response) => {
        this.lookupLoading = false;
        if (response.data) {
          this.foundUser = response.data;
          this.message.success(this.i18n.translate('momApp.admin.families.messages.userFound') || 'Đã tìm thấy người dùng!');
        } else {
          this.message.error(this.i18n.translate('momApp.admin.families.messages.userNotFound') || 'Không tìm thấy người dùng');
        }
      },
      error: () => {
        this.lookupLoading = false;
        this.message.error(this.i18n.translate('momApp.admin.families.messages.userNotFound') || 'Không tìm thấy người dùng');
      }
    });
  }

  addMember(): void {
    if (!this.selectedFamily || !this.foundUser) {
      return;
    }

    this.addingMember = true;
    const payload = {
      userId: this.foundUser.id,
      role: this.newMemberRole,
      relation: this.newMemberRelation,
      parentUserId: this.newMemberParentId,
      dateOfBirth: this.normalizeDateInput(this.newMemberDateOfBirth)
    };

    this.http.post<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/families/${this.selectedFamily.id}/members`, payload).subscribe({
      next: (response) => {
        this.addingMember = false;
        this.message.success(this.i18n.translate('momApp.admin.families.messages.addMemberSuccess') || 'Thêm thành viên thành công!');
        this.resetAddMemberForm();
        this.refreshSelectedFamily(response.data);
      },
      error: (err) => {
        this.addingMember = false;
        const msg = err?.error?.message || 'Không thể thêm thành viên';
        this.message.error(msg);
      }
    });
  }

  inviteMember(): void {
    if (!this.selectedFamily) return;

    if (!this.newMemberDisplayName || !this.newMemberUsername || !this.newMemberEmail) {
      this.message.warning(this.i18n.translate('momApp.admin.families.messages.allFieldsRequired') || 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    this.addingMember = true;
    const payload = {
      displayName: this.newMemberDisplayName,
      username: this.newMemberUsername,
      email: this.newMemberEmail,
      role: this.newMemberRole,
      relation: this.newMemberRelation,
      parentUserId: this.newMemberParentId,
      dateOfBirth: this.normalizeDateInput(this.newMemberDateOfBirth)
    };

    this.http
      .post<ApiEnvelope<FamilyApi>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamily.id}/members/invite`, payload)
      .subscribe({
      next: (response) => {
        this.addingMember = false;
        this.message.success(this.i18n.translate('momApp.admin.families.messages.inviteMemberSuccess') || 'Thêm thành viên mới thành công!');
        this.resetAddMemberForm();
        this.refreshSelectedFamily(response.data);
      },
      error: (err) => {
        this.addingMember = false;
        const msg = err?.error?.message || 'Không thể tạo thành viên mới';
        this.message.error(msg);
      }
    });
  }

  startEditMember(member: FamilyMemberApi): void {
    this.editingMemberId = member.userId;
    this.editingMemberDisplayName = member.displayName;
    this.editingMemberRole = member.role;
    this.editingMemberRelation = member.relation;
    this.editingMemberParentId = member.parentUserId;
    this.editingMemberDateOfBirth = member.dateOfBirth ?? '';

    this.membersLoading = true;
    this.http.get<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/users/${member.userId}`).subscribe({
      next: (response) => {
        this.membersLoading = false;
        if (response.data) {
          this.editingMemberUsername = response.data.username;
          this.editingMemberEmail = response.data.email;
          this.editingMemberDateOfBirth = response.data.dateOfBirth || member.dateOfBirth || '';
        }
      },
      error: () => {
        this.membersLoading = false;
        this.message.error('Không thể tải chi tiết tài khoản người dùng');
        this.cancelEditMember();
      }
    });
  }

  cancelEditMember(): void {
    this.editingMemberId = null;
    this.editingMemberDisplayName = '';
    this.editingMemberUsername = '';
    this.editingMemberEmail = '';
    this.editingMemberDateOfBirth = '';
    this.editingMemberRole = '';
    this.editingMemberRelation = '';
    this.editingMemberParentId = null;
  }

  saveMember(member: FamilyMemberApi): void {
    if (!this.selectedFamily) {
      return;
    }

    this.savingMember = true;
    const updateRequest = {
      displayName: this.editingMemberDisplayName,
      username: this.editingMemberUsername,
      email: this.editingMemberEmail,
      role: this.editingMemberRole,
      relation: this.editingMemberRelation,
      parentUserId: this.editingMemberParentId,
      dateOfBirth: this.normalizeDateInput(this.editingMemberDateOfBirth)
    };

    this.http
      .put<ApiEnvelope<FamilyApi>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamily.id}/members/${this.editingMemberId}`, updateRequest)
      .subscribe({
      next: (response) => {
        this.savingMember = false;
        this.message.success(this.i18n.translate('momApp.admin.families.messages.updateMemberSuccess') || 'Cập nhật thành viên thành công!');
        this.cancelEditMember();
        this.refreshSelectedFamily(response.data);
      },
      error: (err) => {
        this.savingMember = false;
        const msg = err?.error?.message || 'Không thể cập nhật thành viên';
        this.message.error(msg);
      }
    });
  }

  assignHost(member: FamilyMemberApi): void {
    if (!this.selectedFamily) {
      return;
    }

    this.membersLoading = true;
    this.http
      .put<ApiEnvelope<FamilyApi>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamily.id}/members/${member.userId}/host`, {})
      .subscribe({
        next: (response) => {
          this.membersLoading = false;
          this.message.success(this.i18n.translate('momApp.admin.families.messages.assignHostSuccess'));
          this.refreshSelectedFamily(response.data);
          this.loadFamilies();
        },
        error: (err) => {
          this.membersLoading = false;
          const msg = err?.error?.message || 'Không thể chỉ định Chủ hộ';
          this.message.error(msg);
        }
      });
  }

  demoteHost(member: FamilyMemberApi): void {
    if (!this.selectedFamily) {
      return;
    }

    this.membersLoading = true;
    this.http
      .put<ApiEnvelope<FamilyApi>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamily.id}/members/${member.userId}/demote-host`, {})
      .subscribe({
        next: (response) => {
          this.membersLoading = false;
          this.message.success(this.i18n.translate('momApp.admin.families.messages.demoteHostSuccess'));
          this.refreshSelectedFamily(response.data);
          this.loadFamilies();
        },
        error: (err) => {
          this.membersLoading = false;
          const msg = err?.error?.message || 'Không thể hạ chức danh Chủ hộ';
          this.message.error(msg);
        }
      });
  }

  removeMember(member: FamilyMemberApi): void {
    if (!this.selectedFamily) {
      return;
    }

    this.removingMemberId = member.userId;
    this.http
      .delete<ApiEnvelope<void>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamily.id}/members/${member.userId}`)
      .subscribe({
      next: () => {
        this.removingMemberId = null;
        this.message.success(this.i18n.translate('momApp.admin.families.messages.removeMemberSuccess') || 'Đã xóa thành viên khỏi gia đình!');

        this.http.get<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/admin/families/${this.selectedFamily!.id}`).subscribe({
          next: (res) => {
            if (res.data) {
              this.refreshSelectedFamily(res.data);
            }
          }
        });
      },
      error: (err) => {
        this.removingMemberId = null;
        const msg = err?.error?.message || 'Không thể xóa thành viên';
        this.message.error(msg);
      }
    });
  }

  private refreshSelectedFamily(updatedFamilyRaw: FamilyApi): void {
    const index = this.families.findIndex(f => f.id === updatedFamilyRaw.id);
    if (index !== -1) {
      const creatorName = this.families[index].creatorName;
      const tree = this.buildFamilyTree(updatedFamilyRaw.members ?? []);
      const updatedFamilyView: FamilyView = {
        ...updatedFamilyRaw,
        creatorName,
        memberCount: updatedFamilyRaw.members?.length ?? 0,
        tree
      };
      this.families[index] = updatedFamilyView;
      this.selectedFamily = updatedFamilyView;
      this.applySearch();
      this.loadUpcomingBirthdays(updatedFamilyRaw.id);
    }
  }

  formatDate(dateValue: string | null | undefined): string {
    if (!dateValue?.trim()) {
      return this.i18n.translate('momApp.common.notAvailable');
    }

    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return dateValue;
    }

    return parsed.toLocaleDateString();
  }

  upcomingBirthdayLabel(item: UpcomingBirthdayApi): string {
    if (item.daysUntilBirthday === 0) {
      return this.i18n.translate('momApp.family.birthdays.today');
    }
    if (item.daysUntilBirthday === 1) {
      return this.i18n.translate('momApp.family.birthdays.tomorrow');
    }
    return this.i18n.translate('momApp.family.birthdays.inDays', { days: item.daysUntilBirthday });
  }

  private loadUpcomingBirthdays(familyId: number): void {
    this.upcomingBirthdaysLoading = true;
    this.http
      .get<ApiEnvelope<UpcomingBirthdayApi[]>>(
        `${API_CONFIG.GATEWAY_URL}/account/admin/families/${familyId}/birthdays/upcoming?days=14`
      )
      .subscribe({
        next: (response) => {
          this.upcomingBirthdaysLoading = false;
          this.upcomingBirthdays = response.data ?? [];
        },
        error: () => {
          this.upcomingBirthdaysLoading = false;
          this.upcomingBirthdays = [];
        }
      });
  }

  private normalizeDateInput(raw: string | null | undefined): string | null {
    const value = raw?.trim() ?? '';
    return value ? value : null;
  }

  private getCurrentUserId(): number | null {
    const raw = this.authService.getStoredItem('atg_user_id');
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
