import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  BabyLogComment,
  FamilyMemberProfile,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

export interface ReactionTypeOption {
  type: string;
  emoji: string;
  labelKey: string;
  color: string;
}

@Component({
  selector: 'app-baby-comments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzSpinModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzTagModule
  ],
  templateUrl: './baby-comments.component.html',
  styleUrl: './baby-comments.component.css'
})
export class BabyCommentsComponent implements OnInit {
  @Input() logId!: number;
  @Input() babyId!: number;
  @Input() familyMembers: FamilyMemberProfile[] = [];

  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);

  comments: BabyLogComment[] = [];
  isLoading = false;
  currentUserId: number | null = null;

  // State cho việc tạo bình luận gốc mới
  newCommentText = '';
  isSubmittingNewComment = false;
  newCommentTaggedUserIds: number[] = [];

  // State cho việc trả lời (Reply)
  // key: parentCommentId (id của comment gốc), value: string text
  replyInputs: Record<number, string> = {};
  isSubmittingReply: Record<number, boolean> = {};
  activeReplyFormId: number | null = null; // ID của comment gốc đang mở form reply
  replyTaggedUserIds: Record<number, number[]> = {}; // key: parentCommentId, value: userIds

  // State cho gợi ý nhắc tên (Mention Tagging)
  showMentionDropdown = false;
  filteredMembers: FamilyMemberProfile[] = [];
  mentionSearchQuery = '';
  mentionTriggerIndex = -1;
  activeInputId: 'new' | number | null = null; // 'new' hoặc parentCommentId

  // Các loại Reactions cấu hình
  readonly reactionsList: ReactionTypeOption[] = [
    { type: 'LIKE', emoji: '👍', labelKey: 'momApp.baby.comments.reactions.like', color: '#1890ff' },
    { type: 'LOVE', emoji: '❤️', labelKey: 'momApp.baby.comments.reactions.love', color: '#f5222d' },
    { type: 'HAHA', emoji: '😆', labelKey: 'momApp.baby.comments.reactions.haha', color: '#faad14' },
    { type: 'WOW', emoji: '😮', labelKey: 'momApp.baby.comments.reactions.wow', color: '#fa8c16' },
    { type: 'SAD', emoji: '😢', labelKey: 'momApp.baby.comments.reactions.sad', color: '#13c2c2' },
    { type: 'ANGRY', emoji: '😡', labelKey: 'momApp.baby.comments.reactions.angry', color: '#722ed1' }
  ];

  ngOnInit(): void {
    this.loadComments();
    this.loadCurrentUser();
  }

  loadComments(): void {
    this.isLoading = true;
    this.command.getBabyLogComments(this.logId).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.comments = data || [];
      },
      error: () => {
        this.isLoading = false;
        this.comments = [];
      }
    });
  }

  loadCurrentUser(): void {
    this.command.getProfile().subscribe({
      next: (profile) => {
        this.currentUserId = profile.userId;
      }
    });
  }

  submitNewComment(): void {
    const content = this.newCommentText.trim();
    if (!content) return;

    this.isSubmittingNewComment = true;
    
    // Tự động phân tích thêm các ID user được tag thủ công nếu có dạng @Tên
    const taggedIds = this.extractTaggedUserIds(content, this.newCommentTaggedUserIds);

    this.command.createBabyLogComment(this.logId, content, null, taggedIds).subscribe({
      next: (newComment) => {
        this.isSubmittingNewComment = false;
        this.newCommentText = '';
        this.newCommentTaggedUserIds = [];
        
        // Optimistic UI & refresh
        this.comments = [...this.comments, newComment];
        this.loadComments();
      },
      error: (err) => {
        this.isSubmittingNewComment = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.comments.messages.createFailed')
        );
      }
    });
  }

  submitReply(parentCommentId: number): void {
    const text = (this.replyInputs[parentCommentId] ?? '').trim();
    if (!text) return;

    this.isSubmittingReply[parentCommentId] = true;
    const taggedIds = this.extractTaggedUserIds(text, this.replyTaggedUserIds[parentCommentId] || []);

    this.command.createBabyLogComment(this.logId, text, parentCommentId, taggedIds).subscribe({
      next: () => {
        this.isSubmittingReply[parentCommentId] = false;
        this.replyInputs[parentCommentId] = '';
        if (this.replyTaggedUserIds[parentCommentId]) {
          this.replyTaggedUserIds[parentCommentId] = [];
        }
        this.activeReplyFormId = null;
        
        this.loadComments();
      },
      error: (err) => {
        this.isSubmittingReply[parentCommentId] = false;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.comments.messages.createFailed')
        );
      }
    });
  }

  deleteComment(commentId: number): void {
    this.command.deleteBabyLogComment(commentId).subscribe({
      next: () => {
        this.notification.success(
          this.i18n.translate('momApp.common.success'),
          this.i18n.translate('momApp.baby.comments.messages.deleteSuccess')
        );
        this.loadComments();
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || this.i18n.translate('momApp.baby.comments.messages.deleteFailed')
        );
      }
    });
  }

  // Reactions logic
  toggleLike(comment: BabyLogComment): void {
    if (comment.myReaction) {
      // Nếu đã reaction rồi -> Click thẳng vào nút Like sẽ unreact
      this.unreactComment(comment);
    } else {
      // Nếu chưa reaction -> Click thẳng vào nút Like sẽ mặc định thả LIKE
      this.reactComment(comment, 'LIKE');
    }
  }

  reactComment(comment: BabyLogComment, type: string): void {
    // Optimistic UI update
    const originalMyReaction = comment.myReaction;
    const originalCounts = { ...comment.reactionCounts };

    // Giảm count của reaction cũ nếu có
    if (comment.myReaction && comment.reactionCounts && comment.reactionCounts[comment.myReaction]) {
      comment.reactionCounts[comment.myReaction] = Math.max(0, comment.reactionCounts[comment.myReaction] - 1);
      if (comment.reactionCounts[comment.myReaction] === 0) {
        delete comment.reactionCounts[comment.myReaction];
      }
    }

    // Tăng count của reaction mới
    comment.myReaction = type;
    if (!comment.reactionCounts) {
      comment.reactionCounts = {};
    }
    comment.reactionCounts[type] = (comment.reactionCounts[type] || 0) + 1;

    this.command.reactBabyLogComment(comment.id, type).subscribe({
      error: (err) => {
        // Rollback nếu gọi API thất bại
        comment.myReaction = originalMyReaction;
        comment.reactionCounts = originalCounts;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || 'Không thể thả biểu cảm'
        );
      }
    });
  }

  unreactComment(comment: BabyLogComment): void {
    const originalMyReaction = comment.myReaction;
    const originalCounts = { ...comment.reactionCounts };

    if (comment.myReaction && comment.reactionCounts && comment.reactionCounts[comment.myReaction]) {
      comment.reactionCounts[comment.myReaction] = Math.max(0, comment.reactionCounts[comment.myReaction] - 1);
      if (comment.reactionCounts[comment.myReaction] === 0) {
        delete comment.reactionCounts[comment.myReaction];
      }
    }
    comment.myReaction = null;

    this.command.unreactBabyLogComment(comment.id).subscribe({
      error: (err) => {
        // Rollback
        comment.myReaction = originalMyReaction;
        comment.reactionCounts = originalCounts;
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err?.message || 'Không thể gỡ biểu cảm'
        );
      }
    });
  }

  // Gợi ý mention tagging khi gõ input
  onInput(event: Event, inputId: 'new' | number): void {
    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value;
    const selectionStart = inputEl.selectionStart || 0;

    // Tìm kí tự '@' gần nhất trước con trỏ chuột
    const textBeforeCursor = value.substring(0, selectionStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Kiểm tra xem từ kí tự '@' đến cursor có chứa khoảng trắng không
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        this.activeInputId = inputId;
        this.mentionSearchQuery = textAfterAt.toLowerCase();
        this.showMentionDropdown = true;
        this.mentionTriggerIndex = lastAtIndex;
        this.filterFamilyMembers();
        return;
      }
    }

    this.showMentionDropdown = false;
    this.activeInputId = null;
  }

  filterFamilyMembers(): void {
    if (!this.mentionSearchQuery) {
      this.filteredMembers = this.familyMembers;
    } else {
      this.filteredMembers = this.familyMembers.filter(m =>
        m.displayName.toLowerCase().includes(this.mentionSearchQuery)
      );
    }
  }

  selectMember(member: FamilyMemberProfile, inputEl: HTMLInputElement): void {
    const value = inputEl.value;
    const triggerIndex = this.mentionTriggerIndex;
    const selectionStart = inputEl.selectionStart || 0;

    const beforeAt = value.substring(0, triggerIndex);
    const afterCursor = value.substring(selectionStart);
    const mentionText = `@${member.displayName} `;

    const newValue = beforeAt + mentionText + afterCursor;

    if (this.activeInputId === 'new') {
      this.newCommentText = newValue;
      if (!this.newCommentTaggedUserIds.includes(member.userId)) {
        this.newCommentTaggedUserIds.push(member.userId);
      }
    } else if (typeof this.activeInputId === 'number') {
      const parentId = this.activeInputId;
      this.replyInputs[parentId] = newValue;
      if (!this.replyTaggedUserIds[parentId]) {
        this.replyTaggedUserIds[parentId] = [];
      }
      if (!this.replyTaggedUserIds[parentId].includes(member.userId)) {
        this.replyTaggedUserIds[parentId].push(member.userId);
      }
    }

    this.showMentionDropdown = false;
    this.activeInputId = null;

    // Focus lại và di chuyển con trỏ ra sau tag vừa chọn
    setTimeout(() => {
      inputEl.focus();
      const newCursorPos = triggerIndex + mentionText.length;
      inputEl.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  }

  // Trích xuất tự động các user ID được nhắc đến dựa trên text thực tế
  private extractTaggedUserIds(text: string, trackedIds: number[]): number[] {
    const result: number[] = [];
    this.familyMembers.forEach(member => {
      const mentionPattern = `@${member.displayName}`;
      if (text.includes(mentionPattern)) {
        result.push(member.userId);
      }
    });
    // Trộn lẫn với danh sách được track bằng click gợi ý để đảm bảo chính xác
    trackedIds.forEach(id => {
      if (!result.includes(id) && this.familyMembers.some(m => m.userId === id)) {
        result.push(id);
      }
    });
    return result;
  }

  // Helpers cho UI
  getCommenterName(userId: number): string {
    const member = this.familyMembers.find(m => m.userId === userId);
    return member?.displayName || `#User_${userId}`;
  }

  getCommenterAvatar(userId: number): string | null {
    const member = this.familyMembers.find(m => m.userId === userId);
    return member?.avatarUrl || null;
  }

  getCommenterRole(userId: number): string {
    const member = this.familyMembers.find(m => m.userId === userId);
    if (!member) return '';
    return this.i18n.translate(`momApp.family.role.${member.role}`);
  }

  canDeleteComment(commentUserId: number): boolean {
    return commentUserId === this.currentUserId;
  }

  openReplyForm(commentId: number): void {
    this.activeReplyFormId = this.activeReplyFormId === commentId ? null : commentId;
    if (this.activeReplyFormId !== null && !this.replyInputs[commentId]) {
      this.replyInputs[commentId] = '';
    }
  }

  formatDateTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      // Format dd/MM/yyyy HH:mm
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  }

  // Trích xuất các biểu cảm phổ biến nhất để vẽ cụm reaction icons
  getTopReactions(reactionCounts?: Record<string, number>): ReactionTypeOption[] {
    if (!reactionCounts) return [];
    
    return this.reactionsList
      .filter(r => reactionCounts[r.type] && reactionCounts[r.type] > 0)
      .sort((a, b) => (reactionCounts[b.type] || 0) - (reactionCounts[a.type] || 0))
      .slice(0, 3); // Lấy tối đa 3 loại reaction nhiều nhất
  }

  getTotalReactions(reactionCounts?: Record<string, number>): number {
    if (!reactionCounts) return 0;
    return Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  }

  getReactionInfo(type?: string | null): ReactionTypeOption | null {
    if (!type) return null;
    return this.reactionsList.find(r => r.type === type) || null;
  }
}
