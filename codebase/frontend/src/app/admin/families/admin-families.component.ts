import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
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

@Component({
  selector: 'app-admin-families',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzCardModule, NzInputModule],
  templateUrl: './admin-families.component.html',
  styleUrl: './admin-families.component.css',
})
export class AdminFamiliesComponent implements OnInit {
  loading = false;
  searchText = '';
  families: FamilyView[] = [];
  filteredFamilies: FamilyView[] = [];

  constructor(private readonly http: HttpClient) {}

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
            tree: this.buildFamilyTree(members),
          };
        });
        this.loading = false;
        this.applySearch();
      },
      error: () => {
        this.loading = false;
        this.families = [];
        this.filteredFamilies = [];
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchText = value;
    this.applySearch();
  }

  roleLabel(role: string): string {
    const normalized = (role || '').toUpperCase();
    if (normalized === 'MOM') {
      return 'MOM';
    }
    if (normalized === 'DAD') {
      return 'DAD';
    }
    if (normalized === 'GRANDMA') {
      return 'GRANDMA';
    }
    if (normalized === 'CAREGIVER') {
      return 'CAREGIVER';
    }
    return normalized || 'MEMBER';
  }

  relationLabel(value: string): string {
    if (!value) {
      return 'N/A';
    }
    return value.replace(/_/g, ' ');
  }

  roleClass(role: string): string {
    const normalized = this.roleLabel(role);
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
          children: [],
        };
      }
      visited.add(member.userId);

      const children = (childrenByParent.get(member.userId) ?? [])
        .filter((child) => child.userId !== member.userId)
        .map((child, index) => buildNode(child, `${path}.${index}`));

      return {
        key: `${member.userId}:${path}`,
        member,
        children,
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
    const roleOrder = this.roleWeight(a.role) - this.roleWeight(b.role);
    if (roleOrder !== 0) {
      return roleOrder;
    }
    return (a.displayName || '').localeCompare(b.displayName || '');
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
}
