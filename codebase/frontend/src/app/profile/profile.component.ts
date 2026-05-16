import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, catchError, combineLatest, finalize, map, of, switchMap, tap } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AuthService } from '../auth/auth.service';
import {
  FamilyMemberProfile,
  FamilyRelation,
  FamilyRole,
  ProfileInfo,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

interface BabyProfile {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate: string;
}

interface FamilyTreeMember extends FamilyMemberProfile {
  roleLabel: string;
  relationLabel: string;
  isCurrentUser: boolean;
}

interface FamilyTreeNode {
  key: string;
  kind: 'member' | 'baby';
  relationKey: FamilyRelation | 'CON';
  userId: number | null;
  displayName: string;
  roleLabel: string | null;
  relationLabel: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
  children: FamilyTreeNode[];
  spouse?: FamilyTreeNode;
}

interface ProfileViewModel extends ProfileInfo {
  role: FamilyRole;
  roleLabel: string;
  familyMembers: FamilyTreeMember[];
  familyTree: FamilyTreeNode[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule, NzAvatarModule, NzCardModule, NzButtonModule, NzTagModule, NzIconModule, NzPopoverModule, NzToolTipModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {
  private readonly maxAvatarSize = 30 * 1024 * 1024;
  private readonly authService = inject(AuthService);
  private readonly command = inject(SuperAppCommandService);
  private readonly i18n = inject(I18nService);
  private readonly message = inject(NzMessageService);
  private readonly profileReload$ = new BehaviorSubject<void>(undefined);

  isUploadingAvatar = false;
  treeNodes: FamilyTreeNode[] = [];
  private allNodesFlat: FamilyTreeNode[] = [];

  // Helper methods for Family Graph
  findNodeByRel(rel: string): FamilyTreeNode | undefined {
    return this.allNodesFlat.find(n => n.relationKey === rel);
  }

  getSiblings(side: 'paternal' | 'maternal'): FamilyTreeNode[] {
    const gpRel = side === 'paternal' ? 'ONG_NOI' : 'ONG_NGOAI';
    const gmRel = side === 'paternal' ? 'BA_NOI' : 'BA_NGOAI';
    
    // Find the primary grandparent node for this side
    const grandparent = this.treeNodes.find(n => n.relationKey === gpRel || n.relationKey === gmRel);
    
    if (grandparent) {
      // Get all children from both the grandparent and their spouse
      let siblings = [...grandparent.children];
      if (grandparent.spouse) {
        // Spouses in this view are usually clones or partials, so we look up the full node in allNodesFlat
        const spouseNode = this.allNodesFlat.find(n => n.userId === grandparent.spouse?.userId);
        if (spouseNode && spouseNode.children.length > 0) {
          siblings = [...siblings, ...spouseNode.children];
        }
      }
      
      // De-duplicate by userId
      const uniqueSiblings = siblings.filter((v, i, a) => 
        a.findIndex(t => t.userId === v.userId) === i
      );

      return uniqueSiblings.sort((a, b) => {
        if (side === 'paternal') {
          if (a.relationKey === 'BO') return 1;
          if (b.relationKey === 'BO') return -1;
        } else {
          if (a.relationKey === 'ME') return -1;
          if (b.relationKey === 'ME') return 1;
        }
        return 0;
      });
    }

    // Fallback heuristic if grandparents are not present in the data
    const paternalRels = ['BO', 'BAC', 'CHU', 'CO'];
    const maternalRels = ['ME', 'DI', 'CAU', 'MO', 'THIM'];
    const targets = side === 'paternal' ? paternalRels : maternalRels;
    
    return this.allNodesFlat.filter(n => targets.includes(n.relationKey!))
      .filter(n => {
        if (n.relationKey === 'ME') return side === 'maternal';
        if (n.relationKey === 'BO') return side === 'paternal';
        return true;
      })
      .sort((a, b) => {
        if (side === 'paternal') {
          if (a.relationKey === 'BO') return 1;
          if (b.relationKey === 'BO') return -1;
        } else {
          if (a.relationKey === 'ME') return -1;
          if (b.relationKey === 'ME') return 1;
        }
        return 0;
      });
  }

  getChildrenNodes(): FamilyTreeNode[] {
    const childRels = ['ANH_TRAI', 'CHI_GAI', 'EM_TRAI', 'EM_GAI', 'CON_TRAI', 'CON_GAI', 'CON'];
    return this.allNodesFlat.filter(n => childRels.includes(n.relationKey!) || n.kind === 'baby');
  }

  private flattenTree(nodes: FamilyTreeNode[], seen = new Set<number>()): void {
    nodes.forEach(n => {
      if (n.userId && !seen.has(n.userId)) {
        this.allNodesFlat.push(n);
        seen.add(n.userId);
      }
      if (n.spouse && n.spouse.userId && !seen.has(n.spouse.userId)) {
        this.allNodesFlat.push(n.spouse);
        seen.add(n.spouse.userId);
      }
      this.flattenTree(n.children, seen);
    });
  }

  readonly profile$ = this.profileReload$.pipe(
    switchMap(() =>
      combineLatest({
        profile: this.command.getProfile(),
        familyMembers: this.command.getFamilyMembersDetailed(),
        babies: this.command.getBabies().pipe(
          tap(data => console.log('DEBUG: Babies data fetched:', data)),
          map((items) => items as BabyProfile[]),
          catchError((err) => {
            console.error('DEBUG: Babies fetch error:', err);
            return of([] as BabyProfile[]);
          })
        )
      })
    ),
     map(({ profile, familyMembers, babies }): ProfileViewModel => {
       const currentMember = this.resolveCurrentFamilyMember(profile.userId, familyMembers);
       const enrichedMembers = familyMembers.map((member) => ({
         ...member,
         roleLabel: this.roleLabel(member.role),
         relationLabel: this.relationLabel(member.relation, member.role),
         isCurrentUser: currentMember ? member.userId === currentMember.userId : false
       }));
 
       const selectedProfile = currentMember
         ? {
             userId: currentMember.userId,
             displayName: currentMember.displayName,
             username: currentMember.username,
             email: currentMember.email,
             avatarUrl: currentMember.avatarUrl ?? profile.avatarUrl
           }
         : profile;
 
       const selectedRole = currentMember?.role ?? this.normalizeRole(this.authService.getRolesFromToken()[0]);
       const tree = this.buildFamilyTree(enrichedMembers, babies);
       
       // Sync for the Family Graph view
       this.treeNodes = tree;
       this.allNodesFlat = [];
       this.flattenTree(tree);
 
       return {
         ...selectedProfile,
         role: selectedRole,
         roleLabel: this.roleLabel(selectedRole),
         familyMembers: enrichedMembers,
         familyTree: tree
       };
     })
   );

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.message.warning(this.i18n.translate('momApp.profile.messages.selectImageOnly'));
      return;
    }

    if (file.size > this.maxAvatarSize) {
      this.message.warning(this.i18n.translate('momApp.profile.messages.fileTooLarge'));
      return;
    }

    this.isUploadingAvatar = true;
    this.command
      .uploadProfileAvatar(file)
      .pipe(finalize(() => (this.isUploadingAvatar = false)))
      .subscribe({
        next: (avatarUrl) => {
          this.authService.setAvatarUrl(avatarUrl || null);
          this.profileReload$.next();
          this.message.success(this.i18n.translate('momApp.profile.messages.uploadSuccess'));
        },
        error: (error) => {
          this.message.error(this.resolveUploadErrorMessage(error));
        }
      });
  }

  initialFor(name: string): string {
    const normalized = name?.trim();
    return normalized ? normalized.charAt(0).toUpperCase() : 'U';
  }

  private resolveCurrentFamilyMember(
    profileUserId: number | null,
    members: FamilyMemberProfile[]
  ): FamilyMemberProfile | null {
    const candidateUserIds = [profileUserId, this.command.getUserId()].filter(
      (value): value is number => Number.isFinite(value) && value! > 0
    );
    for (const userId of candidateUserIds) {
      const byId = members.find((member) => member.userId === userId);
      if (byId) {
        return byId;
      }
    }

    const storedUsername = this.authService.getStoredItem('atg_username')?.trim().toLowerCase();
    if (storedUsername) {
      const byUsername = members.find((member) => member.username.trim().toLowerCase() === storedUsername);
      if (byUsername) {
        return byUsername;
      }
    }

    const storedEmail = this.authService.getStoredItem('atg_email')?.trim().toLowerCase();
    if (storedEmail) {
      const byEmail = members.find((member) => member.email.trim().toLowerCase() === storedEmail);
      if (byEmail) {
        return byEmail;
      }
    }

    return null;
  }

  private buildFamilyTree(members: FamilyTreeMember[], babies: BabyProfile[]): FamilyTreeNode[] {
    const nodesByUserId = new Map<number, FamilyTreeNode>();
    const roots: FamilyTreeNode[] = [];
    const processedAsSpouse = new Set<number>();

    // 1. Create all nodes
    members.forEach((member) => {
      nodesByUserId.set(member.userId, {
        key: `member-${member.userId}`,
        kind: 'member',
        relationKey: member.relation,
        userId: member.userId,
        displayName: member.displayName,
        roleLabel: member.roleLabel,
        relationLabel: member.relationLabel,
        username: member.username,
        email: member.email,
        avatarUrl: member.avatarUrl,
        isCurrentUser: member.isCurrentUser,
        children: []
      });
    });

    // 2. Link spouses (Husband -> Wife)
    const link = (hubbyId: number, wifeId: number) => {
      const hubby = nodesByUserId.get(hubbyId);
      const wife = nodesByUserId.get(wifeId);
      if (hubby && wife && hubbyId !== wifeId) {
        hubby.spouse = { ...wife, children: [] }; // Clone to avoid sharing child arrays in view
        processedAsSpouse.add(wifeId);
      }
    };

    const findId = (rel: FamilyRelation) => members.find(m => m.relation === rel)?.userId;
    
    // Grandparents couples
    const ongNoiId = findId('ONG_NOI');
    const baNoiId = findId('BA_NOI');
    if (ongNoiId && baNoiId) link(ongNoiId, baNoiId);

    const ongNgoaiId = findId('ONG_NGOAI');
    const baNgoaiId = findId('BA_NGOAI');
    if (ongNgoaiId && baNgoaiId) link(ongNgoaiId, baNgoaiId);

    // Primary parents couple (Truong + Chinh)
    const dad = members.find(m => m.relation === 'BO') || 
                members.find(m => m.role === 'DAD' && !['ONG_NOI', 'ONG_NGOAI'].includes(m.relation));
    const mom = members.find(m => m.relation === 'ME') || 
                members.find(m => m.role === 'MOM' && !['BA_NOI', 'BA_NGOAI'].includes(m.relation));
    if (dad && mom) link(dad.userId, mom.userId);

    const cauId = findId('CAU');
    const moId = findId('MO');
    if (cauId && moId) link(cauId, moId);

    const bacId = findId('BAC');
    const thimId = findId('THIM');
    if (bacId && thimId) link(bacId, thimId);

    // 3. Build hierarchy
    members.forEach((member) => {
      const node = nodesByUserId.get(member.userId)!;
      let parentId = member.parentUserId;

      if (!parentId) {
        const isGen1 = ['BO', 'ME', 'BAC', 'CHU', 'CO', 'DI', 'CAU', 'MO', 'THIM'].includes(member.relation) || 
                       ['MOM', 'DAD'].includes(member.role);
        const isGen2 = ['ANH_TRAI', 'CHI_GAI', 'EM_TRAI', 'EM_GAI', 'CON_TRAI', 'CON_GAI', 'CON'].includes(member.relation);
        const isGrandparent = ['ONG_NOI', 'BA_NOI', 'ONG_NGOAI', 'BA_NGOAI'].includes(member.relation) || member.role === 'GRANDMA';

        if (isGrandparent) {
          parentId = null;
        } else if (isGen1) {
          if (['BO', 'BAC', 'CHU', 'CO'].includes(member.relation) || (member.role === 'DAD' && member.relation !== 'ME')) {
            parentId = ongNoiId || baNoiId || null;
          } else {
            parentId = ongNgoaiId || baNgoaiId || null;
          }
        } else if (isGen2) {
          parentId = dad?.userId || mom?.userId || null;
        } else {
          parentId = null;
        }
      }

      const parentNode = parentId ? nodesByUserId.get(parentId) : undefined;
      if (parentNode && parentNode.userId !== member.userId) {
        parentNode.children.push(node);
      } else if (!processedAsSpouse.has(member.userId)) {
        // Only add to roots if it's NOT a spouse (to avoid top-level duplicates)
        roots.push(node);
      }
    });

    // 4. Babies anchor to the couple
    const babyAnchor = (dad && nodesByUserId.get(dad.userId)) || (mom && nodesByUserId.get(mom.userId)) || roots[0];
    babies.forEach((baby) => {
      const babyNode: FamilyTreeNode = {
        key: `baby-${baby.id}`,
        kind: 'baby',
        relationKey: 'CON',
        userId: null,
        displayName: baby.name,
        roleLabel: null,
        relationLabel: this.babyRelationLabel(baby.gender),
        username: null,
        email: null,
        avatarUrl: null,
        isCurrentUser: false,
        children: []
      };
      if (babyAnchor) babyAnchor.children.push(babyNode);
      else roots.push(babyNode);
    });

    this.sortTree(roots);
    return roots;
  }

  private sortTree(nodes: FamilyTreeNode[]): void {
    nodes.sort((left, right) => {
      const leftOrder = this.nodeSortOrder(left);
      const rightOrder = this.nodeSortOrder(right);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.displayName.localeCompare(right.displayName);
    });

    nodes.forEach((node) => this.sortTree(node.children));
  }

  private nodeSortOrder(node: FamilyTreeNode): number {
    const relation = node.relationKey;
    const order: Record<FamilyRelation | 'CON', number> = {
      ONG_NOI: 1,
      BA_NOI: 2,
      ONG_NGOAI: 3,
      BA_NGOAI: 4,
      BO: 5,
      ME: 6,
      BAC: 7,
      CHU: 8,
      CO: 9,
      DI: 10,
      CAU: 11,
      MO: 12,
      THIM: 13,
      ANH_TRAI: 14,
      CHI_GAI: 15,
      EM_TRAI: 16,
      EM_GAI: 17,
      CON_TRAI: 18,
      CON_GAI: 19,
      CON: 20,
      BAO_MAU: 21,
      THANH_VIEN_KHAC: 22
    };

    let baseOrder = order[relation] ?? 99;

    // Adjust order based on role if relation is generic
    if (baseOrder >= 21) {
      const label = (node.displayName + (node.roleLabel || '') + (node.relationLabel || '')).toLowerCase();
      if (label.includes('bà') || relation === 'BA_NOI' || relation === 'BA_NGOAI') {
        baseOrder = 2; 
      } else if (label.includes('ông') || relation === 'ONG_NOI' || relation === 'ONG_NGOAI') {
        baseOrder = 1; 
      } else if (label.includes('mẹ')) {
        baseOrder = 6;
      } else if (label.includes('bố') || label.includes('ba')) {
        baseOrder = 5;
      }
    }

    // Ensure Gen 0 is always top
    if (['ONG_NOI', 'BA_NOI', 'ONG_NGOAI', 'BA_NGOAI'].includes(relation)) {
      baseOrder = Math.min(baseOrder, 4);
    }

    return baseOrder;
  }

  private normalizeRole(rawRole: string | undefined): FamilyRole {
    if (rawRole === 'MOM' || rawRole === 'DAD' || rawRole === 'GRANDMA' || rawRole === 'CAREGIVER' || rawRole === 'ADMIN') {
      return rawRole;
    }
    return 'MOM';
  }

  private roleLabel(role: FamilyRole): string {
    const translatedRole = this.i18n.translate(`momApp.family.role.${role}`);
    return translatedRole === `momApp.family.role.${role}` ? role : translatedRole;
  }

  private relationLabel(relation: FamilyRelation, role: FamilyRole): string {
    const byRelation: Record<FamilyRelation, string> = {
      ONG_NOI: 'Ông nội',
      BA_NOI: 'Bà nội',
      ONG_NGOAI: 'Ông ngoại',
      BA_NGOAI: 'Bà ngoại',
      BO: 'Bố',
      ME: 'Mẹ',
      ANH_TRAI: 'Anh trai',
      CHI_GAI: 'Chị gái',
      EM_TRAI: 'Em trai',
      EM_GAI: 'Em gái',
      CON_TRAI: 'Con trai',
      CON_GAI: 'Con gái',
      CHU: 'Chú',
      BAC: 'Bác',
      CO: 'Cô',
      DI: 'Dì',
      CAU: 'Cậu',
      MO: 'Mợ',
      THIM: 'Thím',
      BAO_MAU: 'Bảo mẫu',
      THANH_VIEN_KHAC: 'Thành viên khác'
    };

    const relationLabel = byRelation[relation];
    if (relationLabel) {
      return relationLabel;
    }
    return this.roleLabel(role);
  }

  private babyRelationLabel(gender: BabyProfile['gender']): string {
    if (gender === 'MALE') {
      return 'Con trai';
    }
    if (gender === 'FEMALE') {
      return 'Con gái';
    }
    return 'Con';
  }

  private resolveUploadErrorMessage(error: unknown): string {
    const fallback = this.i18n.translate('momApp.profile.messages.uploadFailed');
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error && typeof error.error === 'object') {
      const message = (error.error as { message?: string }).message;
      if (message?.trim()) {
        return message;
      }
    }

    return fallback;
  }
}
