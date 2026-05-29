import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, AfterViewChecked, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_CONFIG } from '../shared/constants/api.constant';
import { I18nService } from '../i18n/i18n.service';
import { SuperAppCommandService } from '../core/services/super-app-command.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

interface AiChatResponse {
  answer: string;
  model: string;
  responseId: string;
  usage?: AiUsage;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

@Component({
  selector: 'app-ai-copilot',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzToolTipModule,
  ],
  templateUrl: './ai-copilot.component.html',
  styleUrl: './ai-copilot.component.css'
})
export class AiCopilotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageListContainer') private messageListRef!: ElementRef;

  familyId = API_CONFIG.DEFAULT_FAMILY_ID;
  familyName = '';
  isLoadingContext = false;
  context = '';
  draft = '';
  loading = false;
  lastModel = '';
  lastUsage?: AiUsage;
  lastResponseId?: string;
  private shouldScrollToBottom = false;

  readonly quickPrompts = [
    'Tóm tắt tình hình gia đình hôm nay.',
    'Gợi ý thực đơn 3 ngày tới.',
    'Phân tích rủi ro chi tiêu tháng này.',
    'Viết checklist chăm sóc bé cuối tuần.'
  ];

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: 'Chào bạn, tôi là AI Copilot của BabySystem. Hãy hỏi về bữa ăn, chi tiêu, chăm sóc bé, công việc hoặc tài liệu gia đình.',
      createdAt: new Date()
    }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly i18n: I18nService,
    private readonly command: SuperAppCommandService
  ) {}

  ngOnInit(): void {
    this.familyId = this.command.getFamilyId();
    this.loadFamilyDetails();
    this.autoLoadContext();
  }

  loadFamilyDetails(): void {
    this.http.get<ApiResponse<any>>(`${API_CONFIG.GATEWAY_URL}/account/families/${this.familyId}`).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.familyName = response.data.name || `Gia đình #${this.familyId}`;
        } else {
          this.familyName = `Gia đình #${this.familyId}`;
        }
      },
      error: () => {
        this.familyName = `Gia đình #${this.familyId}`;
      }
    });
  }

  autoLoadContext(): void {
    if (this.isLoadingContext) return;
    this.isLoadingContext = true;

    forkJoin({
      babies: this.command.getBabies().pipe(catchError(() => of([]))),
      expenses: this.command.getExpenses().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ babies, expenses }) => {
        let generatedContext = '';

        if (babies && babies.length > 0) {
          generatedContext += `=== THÔNG TIN CÁC BÉ ===\n`;
          babies.forEach((baby) => {
            const birthDateStr = baby.birthDate ? new Date(baby.birthDate).toLocaleDateString('vi-VN') : 'Chưa rõ';
            const genderStr = baby.gender === 'MALE' ? 'Nam' : baby.gender === 'FEMALE' ? 'Nữ' : 'Khác';
            generatedContext += `- Bé: ${baby.name} (Sinh ngày: ${birthDateStr}, Giới tính: ${genderStr})\n`;
            if (baby.notes) {
              generatedContext += `  Ghi chú: ${baby.notes}\n`;
            }
          });
          generatedContext += `\n`;
        }

        if (expenses && expenses.length > 0) {
          generatedContext += `=== CHI TIÊU THÁNG NÀY ===\n`;
          const totalSpent = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
          generatedContext += `- Tổng chi tiêu: ${totalSpent.toLocaleString('vi-VN')} VND\n`;
          generatedContext += `- Giao dịch gần đây:\n`;
          expenses.slice(0, 5).forEach((item) => {
            generatedContext += `  + ${item.categoryName}: ${item.amount?.toLocaleString('vi-VN')} VND${item.note ? ' (' + item.note + ')' : ''}\n`;
          });
        }

        if (!generatedContext) {
          generatedContext = 'Chưa có dữ liệu các bé hoặc chi tiêu của gia đình để làm ngữ cảnh.';
        }

        this.context = generatedContext;
        this.isLoadingContext = false;
      },
      error: () => {
        this.isLoadingContext = false;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageListRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (_) {}
  }

  send(): void {
    const message = this.draft.trim();
    if (!message || this.loading) {
      return;
    }

    const history = this.messages
      .slice(1)
      .filter((item) => item.content.trim().length > 0)
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));

    this.messages = [
      ...this.messages,
      { role: 'user', content: message, createdAt: new Date() }
    ];
    this.draft = '';
    this.loading = true;
    this.shouldScrollToBottom = true;

    this.http.post<ApiResponse<AiChatResponse>>(`${API_CONFIG.GATEWAY_URL}/ai/copilot/chat`, {
      familyId: this.familyId,
      locale: this.i18n.getCurrentLanguage(),
      message,
      context: this.context.trim() || undefined,
      history
    }).subscribe({
      next: (response) => {
        const data = response.data;
        this.lastModel = data?.model || '';
        this.lastUsage = data?.usage;
        this.lastResponseId = data?.responseId;
        this.messages = [
          ...this.messages,
          {
            role: 'assistant',
            content: data?.answer || 'AI không trả về nội dung.',
            createdAt: new Date()
          }
        ];
        this.loading = false;
        this.shouldScrollToBottom = true;
      },
      error: (error) => {
        const messageText = error?.error?.message || 'Không thể gọi AI Copilot.';
        this.messages = [
          ...this.messages,
          { role: 'assistant', content: messageText, createdAt: new Date() }
        ];
        this.loading = false;
        this.shouldScrollToBottom = true;
      }
    });
  }

  usePrompt(prompt: string): void {
    this.draft = prompt;
  }

  clearConversation(): void {
    this.lastResponseId = undefined;
    this.lastUsage = undefined;
    this.lastModel = '';
    this.messages = this.messages.slice(0, 1);
  }

  onEnterKey(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
