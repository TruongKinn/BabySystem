import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, of, Subscription } from 'rxjs';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzProgressModule } from 'ng-zorro-antd/progress';

import {
  BabyProfile,
  BatchImportResponse,
  DocumentParseResponse,
  ExcelParseResponse,
  ExcelParseRow,
  ExpenseCategoryApi,
  FileMetadata,
  SuperAppCommandService
} from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';
import { API_CONFIG } from '../shared/constants/api.constant';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule,
    NzSelectModule,
    NzSpinModule,
    NzEmptyModule,
    NzTableModule,
    NzTabsModule,
    NzTagModule,
    NzToolTipModule,
    NzProgressModule
  ],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent implements OnInit {
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly modalService = inject(NzModalService);
  private readonly fb = inject(FormBuilder);

  // Template API Url
  templateExcelUrl = `${API_CONFIG.GATEWAY_URL}/file/files/template/excel`;

  // Tab State
  activeTab = 0;

  // Common UI State
  loading = false;
  uploading = false;
  uploadProgress = 0;
  dragOver = false;

  // Tab 1: Baby Profiles & Documents
  babies: BabyProfile[] = [];
  selectedBabyId: number | null = null;
  babyFiles: FileMetadata[] = [];
  selectedBabyFilesLoading = false;

  // Tab 2: Expense Excel Parse & Import
  parsedExcel: ExcelParseResponse | null = null;
  expenseCategories: ExpenseCategoryApi[] = [];
  excelHeaders: string[] = [];
  excelRows: ExcelParseRow[] = [];
  selectedRows: Record<number, boolean> = {};
  isImporting = false;
  importResult: BatchImportResponse | null = null;
  showImportResultModal = false;

  // Tab 3: General Family Documents
  generalFiles: FileMetadata[] = [];
  generalFilesLoading = false;

  // Inline Preview Modal
  isViewerModalVisible = false;
  sanitizedViewerUrl: SafeResourceUrl | null = null;
  viewerImageUrl: SafeUrl | null = null;
  viewerErrorMessage = '';
  selectedViewerFile: FileMetadata | null = null;
  isLoadingViewer = false;
  viewerFileType: 'pdf' | 'image' | 'other' = 'other';
  private viewerObjectUrl: string | null = null;
  private viewerRequest: Subscription | null = null;


  // Upload Form
  readonly fileUploadForm = this.fb.group({
    tag: ['']
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;
    forkJoin({
      babies: this.command.getBabies().pipe(catchError(() => of([] as BabyProfile[]))),
      categories: this.command.getExpenseCategories().pipe(catchError(() => of([] as ExpenseCategoryApi[])))
    })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe(({ babies, categories }) => {
        this.babies = babies;
        this.expenseCategories = categories;
        if (babies.length > 0) {
          this.selectedBabyId = babies[0].id;
          this.loadBabyFiles(babies[0].id);
        }
      });

    this.loadGeneralFiles();
  }

  // ---- TAB 1: BABY DOCUMENTS ----
  onBabyChange(babyId: number): void {
    this.selectedBabyId = babyId;
    this.loadBabyFiles(babyId);
  }

  loadBabyFiles(babyId: number): void {
    this.selectedBabyFilesLoading = true;
    this.command.getFiles('baby-documents', `baby:${babyId}`)
      .pipe(
        finalize(() => { this.selectedBabyFilesLoading = false; }),
        catchError(() => of([] as FileMetadata[]))
      )
      .subscribe(files => {
        this.babyFiles = files;
      });
  }

  // ---- TAB 2: EXCEL IMPORT FOR EXPENSES ----
  handleExcelDrop(file: File): void {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.notification.warning(
        this.i18n.translate('common.warningTitle'),
        'Vui lòng kéo thả tệp Excel (.xlsx hoặc .xls)'
      );
      return;
    }

    this.uploading = true;
    this.uploadProgress = 30;

    this.command.parseExcelFile(file)
      .pipe(
        finalize(() => {
          this.uploading = false;
          this.uploadProgress = 0;
        })
      )
      .subscribe({
        next: (res) => {
          this.parsedExcel = res;
          this.excelHeaders = res.headers;
          this.excelRows = res.rows;
          this.selectedRows = {};
          // Auto select all valid parsed rows
          res.rows.forEach(row => {
            this.selectedRows[row.rowNumber] = true;
          });
          this.importResult = null;
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            `Đã parse thành công tệp Excel với ${res.totalRows} hàng.`
          );
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err.message || 'Lỗi phân tích tệp Excel. Vui lòng kiểm tra lại cấu trúc.'
          );
        }
      });
  }

  onRowValueChange(rowNumber: number, field: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    const row = this.excelRows.find(r => r.rowNumber === rowNumber);
    if (row && row.data) {
      row.data[field] = value;
    }
  }

  toggleRowSelection(rowNumber: number): void {
    this.selectedRows[rowNumber] = !this.selectedRows[rowNumber];
  }

  toggleAllRows(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.excelRows.forEach(row => {
      this.selectedRows[row.rowNumber] = checked;
    });
  }

  isAllRowsSelected(): boolean {
    if (this.excelRows.length === 0) return false;
    return this.excelRows.every(row => this.selectedRows[row.rowNumber]);
  }

  executeImport(): void {
    const importPayload: any[] = [];
    const familyId = this.command.getFamilyId();

    this.excelRows.forEach(row => {
      if (this.selectedRows[row.rowNumber]) {
        // Map excel data columns to Downstream CreateExpenseRequest format
        const rowData = row.data;
        
        // Resolve spentAt date
        let spentAt: string | null = null;
        const rawDate = rowData['Ngày chi tiêu'] || rowData['spentAt'] || rowData['Date'];
        if (rawDate) {
          try {
            spentAt = new Date(rawDate).toISOString();
          } catch {
            spentAt = new Date().toISOString();
          }
        } else {
          spentAt = new Date().toISOString();
        }

        // Resolve Category String to categoryId
        const categoryNameStr = String(rowData['Danh mục'] || rowData['category'] || rowData['Category'] || '').trim();
        let categoryId: number | null = null;
        if (categoryNameStr) {
          const matched = this.expenseCategories.find(c => c.name.toLowerCase() === categoryNameStr.toLowerCase());
          if (matched) {
            categoryId = matched.id;
          } else if (this.expenseCategories.length > 0) {
            // Fallback to first category if not matched
            categoryId = this.expenseCategories[0].id;
          }
        }

        const amountRaw = Number(rowData['Số tiền'] || rowData['amount'] || rowData['Amount'] || 0);
        const amount = Number.isFinite(amountRaw) ? amountRaw : 0;
        const note = String(rowData['Ghi chú'] || rowData['note'] || rowData['Note'] || '').trim();

        if (categoryId && amount > 0) {
          importPayload.push({
            familyId,
            categoryId,
            amount,
            currency: 'VND',
            note: note || 'Nhập từ file Excel',
            spentAt
          });
        }
      }
    });

    if (importPayload.length === 0) {
      this.notification.warning(
        this.i18n.translate('common.warningTitle'),
        'Không có hàng dữ liệu hợp lệ nào được chọn hoặc thiếu thông tin danh mục.'
      );
      return;
    }

    this.isImporting = true;
    this.command.importExpensesBatch(importPayload)
      .pipe(finalize(() => { this.isImporting = false; }))
      .subscribe({
        next: (res) => {
          this.importResult = res;
          this.showImportResultModal = true;
          // Clean up spreadsheet preview after success
          if (res.failedCount === 0) {
            this.parsedExcel = null;
            this.excelRows = [];
          }
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err.message || 'Nhập dữ liệu hàng loạt thất bại. Vui lòng kiểm tra kết nối.'
          );
        }
      });
  }

  // ---- TAB 3: GENERAL FAMILY DOCUMENTS ----
  loadGeneralFiles(): void {
    this.generalFilesLoading = true;
    this.command.getFiles('family-documents')
      .pipe(
        finalize(() => { this.generalFilesLoading = false; }),
        catchError(() => of([] as FileMetadata[]))
      )
      .subscribe(files => {
        this.generalFiles = files;
      });
  }

  // ---- COMMON FILE UPLOAD LOGIC ----
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    const file = event.dataTransfer?.files[0];
    if (!file) return;

    if (this.activeTab === 0) {
      this.uploadBabyDocument(file);
    } else if (this.activeTab === 1) {
      this.handleExcelDrop(file);
    } else {
      this.uploadGeneralDocument(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (this.activeTab === 0) {
      this.uploadBabyDocument(file);
    } else if (this.activeTab === 1) {
      this.handleExcelDrop(file);
    } else {
      this.uploadGeneralDocument(file);
    }
  }

  uploadBabyDocument(file: File): void {
    if (!this.selectedBabyId) {
      this.notification.warning('Chọn em bé', 'Vui lòng chọn em bé trước khi tải lên hồ sơ.');
      return;
    }

    this.uploading = true;
    this.uploadProgress = 20;

    const tag = this.fileUploadForm.controls.tag.value?.trim() || 'hồ sơ';

    this.command.uploadFile(file, 'baby-documents', `baby:${this.selectedBabyId}`)
      .pipe(finalize(() => { this.uploading = false; this.uploadProgress = 0; }))
      .subscribe({
        next: () => {
          this.notification.success(this.i18n.translate('momApp.common.success'), 'Tải lên tài liệu bé thành công.');
          this.loadBabyFiles(this.selectedBabyId!);
          this.fileUploadForm.reset();
        },
        error: (err) => {
          this.notification.error(this.i18n.translate('common.errorTitle'), err.message || 'Tải lên thất bại.');
        }
      });
  }

  uploadGeneralDocument(file: File): void {
    this.uploading = true;
    this.uploadProgress = 20;

    this.command.uploadFile(file, 'family-documents')
      .pipe(finalize(() => { this.uploading = false; this.uploadProgress = 0; }))
      .subscribe({
        next: () => {
          this.notification.success(this.i18n.translate('momApp.common.success'), 'Tải lên tài liệu dùng chung thành công.');
          this.loadGeneralFiles();
        },
        error: (err) => {
          this.notification.error(this.i18n.translate('common.errorTitle'), err.message || 'Tải lên thất bại.');
        }
      });
  }

  // ---- COMMON FILE ACTIONS ----
  closeViewerModal(): void {
    this.viewerRequest?.unsubscribe();
    this.viewerRequest = null;
    this.revokeViewerObjectUrl();
    this.isViewerModalVisible = false;
    this.sanitizedViewerUrl = null;
    this.viewerImageUrl = null;
    this.viewerErrorMessage = '';
    this.selectedViewerFile = null;
    this.isLoadingViewer = false;
  }

  viewFile(file: FileMetadata): void {
    this.viewerRequest?.unsubscribe();
    this.viewerRequest = null;
    this.revokeViewerObjectUrl();
    this.selectedViewerFile = file;
    this.isViewerModalVisible = true;
    this.isLoadingViewer = true;
    this.sanitizedViewerUrl = null;
    this.viewerImageUrl = null;
    this.viewerErrorMessage = '';

    const fileName = (file.originalFileName || '').toLowerCase();
    if (fileName.endsWith('.pdf')) {
      this.viewerFileType = 'pdf';
    } else if (
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.svg') ||
      fileName.endsWith('.webp')
    ) {
      this.viewerFileType = 'image';
    } else {
      this.viewerFileType = 'other';
    }

    if (this.viewerFileType === 'other') {
      this.isLoadingViewer = false;
      return;
    }

    this.viewerRequest = this.command.getFileViewBlob(file.id)
      .pipe(finalize(() => {
        this.isLoadingViewer = false;
        this.viewerRequest = null;
      }))
      .subscribe({
        next: (blob) => {
          if (!this.isViewerModalVisible || this.selectedViewerFile?.id !== file.id) {
            return;
          }

          if (!blob || blob.size === 0) {
            this.viewerErrorMessage = 'Không lấy được đường dẫn xem trực tiếp cho file này.';
            return;
          }

          const viewerBlob = blob.type
            ? blob
            : blob.slice(0, blob.size, this.getViewerFallbackMimeType(fileName));
          const viewerUrl = URL.createObjectURL(viewerBlob);
          this.viewerObjectUrl = viewerUrl;

          if (this.viewerFileType === 'pdf') {
            this.sanitizedViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
          } else {
            this.viewerImageUrl = this.sanitizer.bypassSecurityTrustUrl(viewerUrl);
          }
        },
        error: (err) => {
          this.sanitizedViewerUrl = null;
          this.viewerImageUrl = null;
          this.viewerErrorMessage = 'Không thể mở file trực tiếp. Vui lòng thử tải xuống.';
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.error?.message || err?.message || this.viewerErrorMessage
          );
        }
      });
  }

  getFileIconClass(fileName: string): string {
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    if (['doc', 'docx'].includes(ext || '')) return 'icon-wrapper doc-theme';
    if (['xls', 'xlsx'].includes(ext || '')) return 'icon-wrapper xls-theme';
    if (['ppt', 'pptx'].includes(ext || '')) return 'icon-wrapper ppt-theme';
    if (['zip', 'rar', '7z'].includes(ext || '')) return 'icon-wrapper zip-theme';
    return 'icon-wrapper generic-theme';
  }

  getFileIconType(fileName: string): string {
    const ext = (fileName || '').split('.').pop()?.toLowerCase();
    if (['doc', 'docx'].includes(ext || '')) return 'file-word';
    if (['xls', 'xlsx'].includes(ext || '')) return 'file-excel';
    if (['ppt', 'pptx'].includes(ext || '')) return 'file-ppt';
    if (['zip', 'rar', '7z'].includes(ext || '')) return 'file-zip';
    return 'file-protect';
  }


  downloadFile(file: FileMetadata): void {
    this.command.getFileDownloadUrl(file.id).subscribe({
      next: (url) => {
        if (typeof window !== 'undefined') {
          window.open(url, '_blank', 'noopener');
        }
      },
      error: (err) => {
        this.notification.error(
          this.i18n.translate('common.errorTitle'),
          err.message || 'Không thể tải xuống tệp.'
        );
      }
    });
  }

  deleteFile(file: FileMetadata, type: 'baby' | 'general'): void {
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa tệp tin',
      nzContent: `Bạn có chắc chắn muốn xóa tệp "${file.originalFileName}"? Hành động này không thể khôi phục lại.`,
      nzOkText: 'Xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        this.command.deleteFile(file.id).subscribe({
          next: () => {
            this.notification.success(this.i18n.translate('momApp.common.success'), 'Đã xóa tệp tin thành công.');
            if (type === 'baby') {
              this.loadBabyFiles(this.selectedBabyId!);
            } else {
              this.loadGeneralFiles();
            }
          },
          error: (err) => {
            this.notification.error(this.i18n.translate('common.errorTitle'), err.message || 'Không thể xóa tệp.');
          }
        });
      }
    });
  }

  // ---- HELPER METHODS ----
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isSpreadsheet(fileName: string): boolean {
    return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  }

  getFileIcon(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'file-pdf';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'file-word';
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'file-excel';
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'picture';
    return 'file';
  }

  private getViewerFallbackMimeType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.png')) return 'image/png';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
    if (fileName.endsWith('.gif')) return 'image/gif';
    if (fileName.endsWith('.svg')) return 'image/svg+xml';
    if (fileName.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
  }

  private revokeViewerObjectUrl(): void {
    if (this.viewerObjectUrl) {
      URL.revokeObjectURL(this.viewerObjectUrl);
      this.viewerObjectUrl = null;
    }
  }

  formatFileTag(fileTag: string | null, defaultTag: string): string {
    if (!fileTag) return defaultTag;
    if (fileTag.startsWith('baby:')) {
      const babyId = Number(fileTag.split(':')[1]);
      const baby = this.babies.find(b => b.id === babyId);
      return baby ? `Hồ sơ bé ${baby.name}` : 'Hồ sơ của Bé';
    }
    return fileTag;
  }
}
