import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, interval, Observable, of, Subscription } from 'rxjs';

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
  DocumentCategory,
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
export class DocumentsComponent implements OnInit, OnDestroy {
  private readonly command = inject(SuperAppCommandService);
  private readonly notification = inject(NzNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly modalService = inject(NzModalService);
  private readonly fb = inject(FormBuilder);

  // Template API Url
  templateExcelUrl = `${API_CONFIG.GATEWAY_URL}/file/files/template/excel`;

  getTemplateDownloadUrl(type: string, size?: number): string {
    const sizeParam = size ? `&size=${size}` : '';
    return `${API_CONFIG.GATEWAY_URL}/file/files/template/excel?type=${type}${sizeParam}`;
  }

  // Premium POI Template Collection
  poiTemplates = [
    {
      id: 'expense',
      title: 'Mẫu Chi tiêu Gia đình',
      desc: 'Mẫu nhập nhanh các khoản chi tiêu hàng ngày của cả gia đình để phân tích tài chính.',
      icon: 'file-excel',
      color: '#f97316',
      colorRGB: '249, 115, 22',
      columns: ['Ngày chi tiêu', 'Danh mục', 'Số tiền', 'Ghi chú']
    },
    {
      id: 'baby',
      title: 'Mẫu Sức khỏe & Dinh dưỡng Bé',
      desc: 'Theo dõi chi tiết bữa ăn, lượng sữa, chiều cao, cân nặng và ghi chú y tế của bé.',
      icon: 'smile',
      color: '#ec4899',
      colorRGB: '236, 72, 153',
      columns: ['Ngày giờ', 'Loại bữa ăn', 'Lượng ăn', 'Chiều cao', 'Cân nặng', 'Ghi chú y tế']
    },
    {
      id: 'shopping',
      title: 'Mẫu Kế hoạch Mua sắm',
      desc: 'Lên danh sách chuẩn bị mua sắm đồ dùng gia đình, tã bỉm, đồ chơi với số lượng, giá cả.',
      icon: 'shopping-cart',
      color: '#8b5cf6',
      colorRGB: '139, 92, 246',
      columns: ['Tên món đồ', 'Danh mục', 'Đơn giá', 'Số lượng', 'Ưu tiên', 'Ghi chú']
    },
    {
      id: 'vaccine',
      title: 'Mẫu Lịch Tiêm chủng của Bé',
      desc: 'Ghi nhật ký lịch tiêm phòng vắc xin của bé, chi phí, cơ sở y tế và ngày hẹn tiếp theo.',
      icon: 'safety-certificate',
      color: '#0d9488',
      colorRGB: '13, 148, 136',
      columns: ['Ngày tiêm', 'Tên vắc xin', 'Mũi số', 'Chi phí', 'Cơ sở tiêm', 'Ngày hẹn sau']
    }
  ];

  // Tab State
  activeTab = 0;

  // Common UI State
  loading = false;

  // Tab 1: Baby Documents State
  babyUploading = false;
  babyUploadProgress = 0;
  babyDragOver = false;

  // Tab 2: Excel Parse State
  excelUploading = false;
  excelUploadProgress = 0;
  excelDragOver = false;

  // Tab 1: Baby Profiles & Documents
  babies: BabyProfile[] = [];
  selectedBabyId: number | null = null;
  babyFiles: FileMetadata[] = [];
  selectedBabyFilesLoading = false;
  babySelectedFileIds = new Set<number>();
  babyMultiSelectMode = false;

  // Tab 2: Expense Excel Parse & Import (Multi-File Support)
  parsedExcelFiles: Array<{
    fileName: string;
    rawFile?: File;
    parsedData: ExcelParseResponse;
    headers: string[];
    rows: ExcelParseRow[];
    selectedRows: Record<number, boolean>;
    isImported: boolean;
    importResult: any;
  }> = [];
  selectedExcelFileIndex: number | null = null;

  parsedExcel: ExcelParseResponse | null = null;
  expenseCategories: ExpenseCategoryApi[] = [];
  excelHeaders: string[] = [];
  excelRows: ExcelParseRow[] = [];
  selectedRows: Record<number, boolean> = {};
  isImporting = false;
  importResult: any = null;
  showImportResultModal = false;
  isBulkImporting = false;
  showBulkImportResultModal = false;
  bulkImportResults: Array<{
    fileName: string;
    successCount: number;
    failedCount: number;
    errors: Array<{ index: number; reason: string }>;
  }> = [];

  // Async Import History & Polling Properties
  excelActiveSubView: 'import' | 'history' = 'import';
  importHistoryList: any[] = [];
  historyTotalItems = 0;
  historyPageIndex = 1;
  historyPageSize = 10;
  historyLoading = false;
  showHistoryErrorModal = false;
  selectedHistoryItem: any = null;
  historyErrors: any[] = [];
  isPollingHistory = false;
  pollingSubscription: Subscription | null = null;
  isImportingAsync = false;

  // Tab 3: General Family Documents
  generalUploading = false;
  generalUploadProgress = 0;
  generalDragOver = false;
  generalFiles: FileMetadata[] = [];
  generalFilesLoading = false;
  generalSelectedFileIds = new Set<number>();
  generalMultiSelectMode = false;

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
    selectedCategory: [''],
    customTag: ['']
  });

  documentCategories: DocumentCategory[] = [];
  documentCategoriesLoading = false;

  // Add Category Form
  readonly addCategoryForm = this.fb.group({
    name: ['', Validators.required],
    icon: ['file'],
    color: ['#3b82f6']
  });
  isAddCategoryModalVisible = false;
  isSavingCategory = false;

  loadDocumentCategories(): void {
    this.documentCategoriesLoading = true;
    this.command.getDocumentCategories()
      .pipe(
        finalize(() => { this.documentCategoriesLoading = false; }),
        catchError(() => of([] as DocumentCategory[]))
      )
      .subscribe(cats => {
        this.documentCategories = cats;
      });
  }

  openAddCategoryModal(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.addCategoryForm.reset({
      name: '',
      icon: 'file',
      color: '#3b82f6'
    });
    this.isAddCategoryModalVisible = true;
  }

  closeAddCategoryModal(): void {
    this.isAddCategoryModalVisible = false;
  }

  saveCategory(): void {
    if (this.addCategoryForm.invalid) {
      Object.values(this.addCategoryForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.isSavingCategory = true;
    const formVal = this.addCategoryForm.value;

    this.command.createDocumentCategory({
      name: formVal.name!.trim(),
      icon: formVal.icon || 'file',
      color: formVal.color || '#3b82f6'
    })
      .pipe(finalize(() => { this.isSavingCategory = false; }))
      .subscribe({
        next: (newCat) => {
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            `Đã thêm danh mục "${newCat.name}" thành công.`
          );
          this.isAddCategoryModalVisible = false;
          this.loadDocumentCategories();
          this.fileUploadForm.controls.selectedCategory.setValue(String(newCat.id));
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err.message || 'Thêm danh mục mới thất bại. Vui lòng kiểm tra lại.'
          );
        }
      });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.stopHistoryPolling();
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
    this.loadDocumentCategories();
  }

  // ---- TAB 1: BABY DOCUMENTS ----
  onBabyChange(babyId: number): void {
    this.selectedBabyId = babyId;
    this.loadBabyFiles(babyId);
  }

  loadBabyFiles(babyId: number): void {
    this.selectedBabyFilesLoading = true;
    this.command.getFiles('baby-documents')
      .pipe(
        finalize(() => { this.selectedBabyFilesLoading = false; }),
        catchError(() => of([] as FileMetadata[]))
      )
      .subscribe(files => {
        this.babyFiles = files.filter(f => f.fileTag && f.fileTag.startsWith(`baby:${babyId}`));
      });
  }

  // ---- TAB 2: EXCEL IMPORT FOR EXPENSES ----
  selectExcelFile(index: number): void {
    this.selectedExcelFileIndex = index;
    if (index >= 0 && index < this.parsedExcelFiles.length) {
      const file = this.parsedExcelFiles[index];
      this.parsedExcel = file.parsedData;
      this.excelHeaders = file.headers;
      this.excelRows = file.rows;
      this.selectedRows = file.selectedRows;
      this.importResult = file.importResult;
    } else {
      this.parsedExcel = null;
      this.excelHeaders = [];
      this.excelRows = [];
      this.selectedRows = {};
      this.importResult = null;
    }
  }

  removeExcelFile(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.parsedExcelFiles.splice(index, 1);
    if (this.parsedExcelFiles.length === 0) {
      this.selectedExcelFileIndex = null;
      this.selectExcelFile(-1);
    } else {
      if (this.selectedExcelFileIndex === index) {
        const nextIndex = Math.min(index, this.parsedExcelFiles.length - 1);
        this.selectExcelFile(nextIndex);
      } else if (this.selectedExcelFileIndex !== null && this.selectedExcelFileIndex > index) {
        this.selectedExcelFileIndex--;
        this.selectExcelFile(this.selectedExcelFileIndex);
      }
    }
  }

  handleExcelDrop(file: File): void {
    this.handleExcelFiles([file]);
  }

  handleExcelFiles(files: File[]): void {
    const validFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (validFiles.length === 0) {
      console.warn("[Tab 2 Excel] Không có file đúng định dạng Excel (.xlsx hoặc .xls)");
      this.notification.warning(
        this.i18n.translate('common.warningTitle'),
        'Vui lòng kéo thả hoặc chọn tệp Excel (.xlsx hoặc .xls)'
      );
      return;
    }

    this.excelUploading = true;
    this.excelUploadProgress = 10;
    console.log("[Tab 2 Excel] Bắt đầu parse đồng thời các file Excel:", validFiles.map(f => f.name));

    const parseObservables = validFiles.map(file => {
      return this.command.parseExcelFile(file).pipe(
        catchError((err) => {
          console.error(`[Tab 2 Excel] Parse lỗi file: ${file.name}`, err);
          this.notification.error(
            'Lỗi phân tích tệp',
            `Tệp "${file.name}" phân tích thất bại: ${err.message || 'Sai cấu trúc'}`
          );
          return of(null);
        })
      );
    });

    forkJoin(parseObservables)
      .pipe(
        finalize(() => {
          console.log("[Tab 2 Excel] Kết thúc parse danh sách file.");
          this.excelUploading = false;
          this.excelUploadProgress = 0;
        })
      )
      .subscribe({
        next: (results) => {
          let addedCount = 0;
          results.forEach((res, idx) => {
            if (res) {
              const file = validFiles[idx];
              const selectedRowsMap: Record<number, boolean> = {};
              res.rows.forEach(row => {
                selectedRowsMap[row.rowNumber] = true;
              });

              this.parsedExcelFiles.push({
                fileName: file.name,
                rawFile: file,
                parsedData: res,
                headers: res.headers,
                rows: res.rows,
                selectedRows: selectedRowsMap,
                isImported: false,
                importResult: null
              });
              addedCount++;
            }
          });

          if (addedCount > 0) {
            this.notification.success(
              this.i18n.translate('momApp.common.success'),
              `Đã phân tích thành công ${addedCount} tệp Excel.`
            );
            if (this.selectedExcelFileIndex === null || this.selectedExcelFileIndex < 0) {
              this.selectExcelFile(0);
            }
          }
        },
        error: (err) => {
          console.error("[Tab 2 Excel] Lỗi nghiêm trọng khi parse danh sách file", err);
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            'Không thể phân tích các tệp Excel đã chọn.'
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

  buildImportPayloadForFile(fileItem: any): { dataType: string; payload: any[]; targetBabyId: number | null } {
    const headersStr = fileItem.headers.join(',').toLowerCase();
    let dataType: 'expense' | 'baby_health' | 'shopping' | 'vaccine' = 'expense';

    if (headersStr.includes('ngày giờ') || headersStr.includes('bữa ăn') || headersStr.includes('lượng ăn') || headersStr.includes('chiều cao') || headersStr.includes('cân nặng')) {
      dataType = 'baby_health';
    } else if (headersStr.includes('món đồ') || headersStr.includes('đơn giá') || headersStr.includes('số lượng')) {
      dataType = 'shopping';
    } else if (headersStr.includes('tiêm') || headersStr.includes('vắc xin') || headersStr.includes('chi phí')) {
      dataType = 'vaccine';
    }

    let targetBabyId = this.selectedBabyId;
    if ((dataType === 'vaccine' || dataType === 'baby_health') && !targetBabyId && this.babies.length > 0) {
      targetBabyId = this.babies[0].id;
    }

    const payload: any[] = [];
    const familyId = this.command.getFamilyId();

    fileItem.rows.forEach((row: any) => {
      if (fileItem.selectedRows[row.rowNumber]) {
        const rowData = row.data;

        if (dataType === 'expense') {
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

          const categoryNameStr = String(rowData['Danh mục'] || rowData['category'] || rowData['Category'] || '').trim();
          let categoryId: number | null = null;
          if (categoryNameStr) {
            const matched = this.expenseCategories.find(c => c.name.toLowerCase() === categoryNameStr.toLowerCase());
            if (matched) {
              categoryId = matched.id;
            } else if (this.expenseCategories.length > 0) {
              categoryId = this.expenseCategories[0].id;
            }
          }

          const amountRaw = Number(rowData['Số tiền'] || rowData['amount'] || rowData['Amount'] || 0);
          const amount = Number.isFinite(amountRaw) ? amountRaw : 0;
          const note = String(rowData['Ghi chú'] || rowData['note'] || rowData['Note'] || '').trim();

          if (categoryId && amount > 0) {
            payload.push({
              familyId,
              categoryId,
              amount,
              currency: 'VND',
              note: note || 'Nhập từ file Excel Chi tiêu',
              spentAt
            });
          }
        } else if (dataType === 'shopping') {
          const name = String(rowData['Tên món đồ'] || rowData['name'] || '').trim();
          const category = String(rowData['Danh mục mua sắm'] || rowData['Danh mục'] || rowData['category'] || '').trim();
          const price = Number(rowData['Đơn giá dự kiến'] || rowData['Đơn giá'] || rowData['price'] || 0);
          const quantity = Number(rowData['Số lượng'] || rowData['quantity'] || 0);
          const priority = String(rowData['Mức độ ưu tiên'] || rowData['Ưu tiên'] || rowData['priority'] || '').trim();
          const notes = String(rowData['Ghi chú'] || rowData['notes'] || '').trim();

          if (name) {
            payload.push({
              name,
              category,
              price,
              quantity,
              priority,
              notes
            });
          }
        } else if (dataType === 'vaccine') {
          const dateStr = String(rowData['Ngày tiêm'] || rowData['dateStr'] || '').trim();
          const vaccineName = String(rowData['Tên vắc xin'] || rowData['vaccineName'] || '').trim();
          const shotNo = String(rowData['Mũi số'] || rowData['shotNo'] || '').trim();
          const cost = Number(rowData['Chi phí tiêm'] || rowData['Chi phí'] || rowData['cost'] || 0);
          const location = String(rowData['Cơ sở tiêm chủng'] || rowData['Cơ sở tiêm'] || rowData['location'] || '').trim();
          const nextDateStr = String(rowData['Ngày hẹn tiếp theo'] || rowData['Ngày hẹn sau'] || rowData['nextDateStr'] || '').trim();

          if (vaccineName) {
            payload.push({
              dateStr,
              vaccineName,
              shotNo,
              cost,
              location,
              nextDateStr
            });
          }
        } else if (dataType === 'baby_health') {
          const dateStr = String(rowData['Ngày giờ'] || rowData['dateStr'] || '').trim();
          const mealType = String(rowData['Loại bữa ăn'] || rowData['mealType'] || '').trim();
          const intake = Number(rowData['Lượng ăn (ml/g)'] || rowData['Lượng ăn'] || rowData['intake'] || 0);
          const height = Number(rowData['Chiều cao (cm)'] || rowData['Chiều cao'] || rowData['height'] || 0);
          const weight = Number(rowData['Cân nặng (kg)'] || rowData['Cân nặng'] || rowData['weight'] || 0);
          const notes = String(rowData['Ghi chú y tế'] || rowData['notes'] || '').trim();

          if (dateStr) {
            payload.push({
              dateStr,
              mealType,
              intake,
              height,
              weight,
              notes
            });
          }
        }
      }
    });

    return { dataType, payload, targetBabyId };
  }

  executeSingleImport(): void {
    if (this.selectedExcelFileIndex === null || !this.parsedExcelFiles[this.selectedExcelFileIndex]) {
      return;
    }

    const fileItem = this.parsedExcelFiles[this.selectedExcelFileIndex];
    const { dataType, payload, targetBabyId } = this.buildImportPayloadForFile(fileItem);

    if (payload.length === 0) {
      this.notification.warning(
        this.i18n.translate('common.warningTitle'),
        'Không có hàng dữ liệu hợp lệ nào được chọn để nhập vào hệ thống.'
      );
      return;
    }

    this.isImporting = true;
    let importObs$;

    if (dataType === 'expense') {
      importObs$ = this.command.importExpensesBatch(payload);
    } else if (dataType === 'shopping') {
      importObs$ = this.command.importShoppingBatch(payload);
    } else if (dataType === 'vaccine') {
      importObs$ = this.command.importVaccinationsBatch(targetBabyId!, payload);
    } else {
      importObs$ = this.command.importGrowthBatch(targetBabyId!, payload);
    }

    importObs$.pipe(finalize(() => { this.isImporting = false; }))
      .subscribe({
        next: (res: any) => {
          this.importResult = { ...res, fileName: fileItem.fileName };
          this.showImportResultModal = true;
          if (res.failedCount === 0) {
            fileItem.isImported = true;
            this.notification.success(
              this.i18n.translate('momApp.common.success'),
              `Đã nhập thành công tệp "${fileItem.fileName}" vào hệ thống!`
            );
            setTimeout(() => {
              if (this.selectedExcelFileIndex !== null) {
                this.removeExcelFile(this.selectedExcelFileIndex);
              }
            }, 1200);
          } else {
            this.notification.warning(
              'Nhập tệp hoàn tất có lỗi',
              `Tệp "${fileItem.fileName}" có ${res.failedCount} dòng bị lỗi.`
            );
          }
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err.message || 'Nhập dữ liệu từ Excel thất bại. Vui lòng kiểm tra lại dữ liệu hoặc kết nối.'
          );
        }
      });
  }

  executeBulkImport(): void {
    const pendingFiles = this.parsedExcelFiles.filter(f => !f.isImported);
    if (pendingFiles.length === 0) {
      this.notification.warning('Không có tệp cần nhập', 'Tất cả các tệp Excel đã được nhập thành công.');
      return;
    }

    this.isBulkImporting = true;
    this.bulkImportResults = [];
    console.log("[Tab 2 Excel] Bắt đầu nhập hàng loạt tất cả các tệp:", pendingFiles.map(f => f.fileName));

    const importObservables = pendingFiles.map(fileItem => {
      const { dataType, payload, targetBabyId } = this.buildImportPayloadForFile(fileItem);
      if (payload.length === 0) {
        return of({
          fileName: fileItem.fileName,
          successCount: 0,
          failedCount: 0,
          errors: [{ index: -1, reason: 'Không có dòng dữ liệu nào được chọn.' }]
        });
      }

      let obs$;
      if (dataType === 'expense') {
        obs$ = this.command.importExpensesBatch(payload);
      } else if (dataType === 'shopping') {
        obs$ = this.command.importShoppingBatch(payload);
      } else if (dataType === 'vaccine') {
        obs$ = this.command.importVaccinationsBatch(targetBabyId!, payload);
      } else {
        obs$ = this.command.importGrowthBatch(targetBabyId!, payload);
      }

      return new Observable<any>(observer => {
        obs$.subscribe({
          next: (res: any) => {
            observer.next({
              fileName: fileItem.fileName,
              successCount: res.successCount,
              failedCount: res.failedCount,
              errors: res.errors
            });
            observer.complete();
          },
          error: (err: any) => {
            observer.next({
              fileName: fileItem.fileName,
              successCount: 0,
              failedCount: payload.length,
              errors: [{ index: -1, reason: err.message || 'Lỗi hệ thống hoặc định dạng' }]
            });
            observer.complete();
          }
        });
      });
    });

    forkJoin(importObservables)
      .pipe(finalize(() => { this.isBulkImporting = false; }))
      .subscribe({
        next: (results) => {
          console.log("[Tab 2 Excel] Kết quả nhập hàng loạt (forkJoin):", results);
          this.bulkImportResults = results;
          this.showBulkImportResultModal = true;

          results.forEach(res => {
            if (res.failedCount === 0) {
              const matchedFile = this.parsedExcelFiles.find(f => f.fileName === res.fileName);
              if (matchedFile) {
                matchedFile.isImported = true;
              }
            }
          });

          const totalSuccess = results.reduce((acc, r) => acc + r.successCount, 0);
          const totalFailed = results.reduce((acc, r) => acc + r.failedCount, 0);

          if (totalSuccess > 0) {
            this.notification.success(
              this.i18n.translate('momApp.common.success'),
              `Nhập hàng loạt hoàn tất! Đã nhập thành công ${totalSuccess} dòng dữ liệu.`
            );
            
            setTimeout(() => {
              this.parsedExcelFiles = this.parsedExcelFiles.filter(f => !f.isImported);
              if (this.parsedExcelFiles.length === 0) {
                this.selectedExcelFileIndex = null;
                this.selectExcelFile(-1);
              } else {
                this.selectExcelFile(0);
              }
            }, 1500);
          } else {
            this.notification.warning('Nhập hàng loạt có lỗi', `Không có dữ liệu nào được nhập thành công. Vui lòng kiểm tra báo cáo lỗi.`);
          }
        },
        error: (err) => {
          console.error("[Tab 2 Excel] forkJoin nhập hàng loạt lỗi", err);
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            'Quá trình nhập hàng loạt gặp sự cố. Vui lòng thử lại.'
          );
        }
      });
  }

  executeImport(): void {
    this.executeBulkImport();
  }

  // === APIS HỖ TRỢ NHẬP EXCEL BẤT ĐỒNG BỘ (ASYNC IMPORT & POLLING HISTORY) ===

  setExcelSubView(view: 'import' | 'history'): void {
    this.excelActiveSubView = view;
    if (view === 'history') {
      this.loadImportHistory();
      this.startHistoryPolling();
    } else {
      this.stopHistoryPolling();
    }
  }

  loadImportHistory(): void {
    const familyId = this.command.getFamilyId();
    if (!familyId) return;

    this.historyLoading = true;
    this.command.getImportHistory(familyId, this.historyPageIndex - 1, this.historyPageSize)
      .pipe(finalize(() => { this.historyLoading = false; }))
      .subscribe({
        next: (res: any) => {
          this.importHistoryList = res.content || [];
          this.historyTotalItems = res.totalElements || 0;
          
          // Kiểm tra xem có cần tiếp tục Polling hay không
          const hasActiveTasks = this.importHistoryList.some(item => 
            item.status === 'PENDING' || item.status === 'PROCESSING'
          );
          if (!hasActiveTasks) {
            this.stopHistoryPolling();
          } else if (this.excelActiveSubView === 'history' && !this.isPollingHistory) {
            this.startHistoryPolling();
          }
        },
        error: () => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            'Không thể tải lịch sử nhập tệp Excel.'
          );
        }
      });
  }

  getImportPercent(item: any): number {
    if (!item || item.totalRows === 0) return 0;
    const progress = Math.round(((item.successCount + item.failedCount) / item.totalRows) * 100);
    return Math.min(progress, 100);
  }

  startHistoryPolling(): void {
    if (this.isPollingHistory) return;

    this.isPollingHistory = true;
    this.pollingSubscription = new Subscription();
    const intervalSub = interval(3000).subscribe(() => {
      const familyId = this.command.getFamilyId();
      if (!familyId) return;

      this.command.getImportHistory(familyId, this.historyPageIndex - 1, this.historyPageSize)
        .subscribe({
          next: (res: any) => {
            this.importHistoryList = res.content || [];
            this.historyTotalItems = res.totalElements || 0;

            const hasActiveTasks = this.importHistoryList.some(item => 
              item.status === 'PENDING' || item.status === 'PROCESSING'
            );
            if (!hasActiveTasks) {
              this.stopHistoryPolling();
            }
          },
          error: () => {
            this.stopHistoryPolling();
          }
        });
    });
    this.pollingSubscription.add(intervalSub);
  }

  stopHistoryPolling(): void {
    this.isPollingHistory = false;
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  viewHistoryErrors(item: any): void {
    this.selectedHistoryItem = item;
    this.historyErrors = [];
    if (item.errorDetails) {
      try {
        this.historyErrors = JSON.parse(item.errorDetails);
      } catch {
        this.historyErrors = [{ index: -1, reason: item.errorDetails }];
      }
    }
    this.showHistoryErrorModal = true;
  }

  executeImportAsync(): void {
    if (this.selectedExcelFileIndex === null || !this.parsedExcelFiles[this.selectedExcelFileIndex]) {
      return;
    }

    const fileItem = this.parsedExcelFiles[this.selectedExcelFileIndex];
    if (!fileItem.rawFile) {
      this.notification.error(
        this.i18n.translate('common.errorTitle'),
        'Không tìm thấy tệp Excel gốc để tải lên.'
      );
      return;
    }

    const familyId = this.command.getFamilyId();
    if (!familyId) return;

    let targetBabyId = this.selectedBabyId;
    if ((fileItem.parsedData.headers.includes('Tên vắc xin') || fileItem.parsedData.headers.includes('Loại bữa ăn')) && !targetBabyId && this.babies.length > 0) {
      targetBabyId = this.babies[0].id;
    }

    // Xác định dataType
    let dataType = 'expense';
    if (fileItem.parsedData.headers.includes('Tên món đồ')) {
      dataType = 'shopping';
    } else if (fileItem.parsedData.headers.includes('Tên vắc xin')) {
      dataType = 'vaccine';
    } else if (fileItem.parsedData.headers.includes('Loại bữa ăn')) {
      dataType = 'baby';
    }

    this.isImportingAsync = true;
    this.command.importExcelAsync(fileItem.rawFile, dataType, familyId, targetBabyId || undefined)
      .pipe(finalize(() => { this.isImportingAsync = false; }))
      .subscribe({
        next: (historyId) => {
          this.notification.success(
            this.i18n.translate('momApp.common.success'),
            `Tệp "${fileItem.fileName}" đã được đẩy vào hàng chờ xử lý ngầm!`
          );
          
          fileItem.isImported = true;
          setTimeout(() => {
            if (this.selectedExcelFileIndex !== null) {
              this.removeExcelFile(this.selectedExcelFileIndex);
            }
            this.setExcelSubView('history');
          }, 1000);
        },
        error: (err) => {
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err.message || 'Nhập bất đồng bộ thất bại. Vui lòng thử lại.'
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

  // ---- TAB 1: BABY DOCUMENTS UPLOAD LOGIC ----
  onBabyDragOver(event: DragEvent): void {
    event.preventDefault();
    this.babyDragOver = true;
    console.log("[Tab 1 Baby] onBabyDragOver: Đang kéo file qua dropzone...");
  }

  onBabyDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.babyDragOver = false;
    console.log("[Tab 1 Baby] onBabyDragLeave: Đã rời khỏi dropzone.");
  }

  onBabyFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.babyDragOver = false;
    const files = event.dataTransfer?.files;
    console.log("[Tab 1 Baby] onBabyFileDrop: Kéo thả file thành công. Danh sách files nhận được:", files);
    if (!files || files.length === 0) {
      console.warn("[Tab 1 Baby] Danh sách files trống hoặc rỗng.");
      return;
    }
    this.uploadBabyDocuments(Array.from(files));
  }

  onBabyFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    console.log("[Tab 1 Baby] onBabyFileSelected: Đã chọn file từ Explorer. Danh sách files:", files);
    if (!files || files.length === 0) {
      console.warn("[Tab 1 Baby] Explorer không chọn file nào.");
      input.value = '';
      return;
    }
    const filesArray = Array.from(files);
    input.value = '';
    this.uploadBabyDocuments(filesArray);
  }

  uploadBabyDocuments(files: File[]): void {
    console.log("[Tab 1 Baby] Bắt đầu tải lên tài liệu cho bé. Danh sách files:", files);
    if (!this.selectedBabyId) {
      console.warn("[Tab 1 Baby] Chưa chọn em bé! Stop upload.");
      this.notification.warning('Chọn em bé', 'Vui lòng chọn em bé trước khi tải lên hồ sơ.');
      return;
    }

    this.babyUploading = true;
    this.babyUploadProgress = 10;

    const selectedCatId = this.fileUploadForm.controls.selectedCategory.value;
    let customTag = '';

    if (selectedCatId) {
      const matched = this.documentCategories.find(c => String(c.id) === selectedCatId);
      if (matched) {
        customTag = matched.name;
      }
    }

    const tagValue = customTag || 'Hồ sơ';
    const combinedTag = `baby:${this.selectedBabyId}:${tagValue}`;
    console.log("[Tab 1 Baby] Metadata tag được gán cho file:", combinedTag);

    // Upload tất cả các file cùng lúc
    const uploadObservables = files.map(file => {
      console.log("[Tab 1 Baby] Chuẩn bị upload tệp:", file.name, "size:", file.size, "bytes");
      return this.command.uploadFile(file, 'baby-documents', combinedTag).pipe(
        catchError((err) => {
          const errMsg = err?.error?.message || err?.message || 'Lỗi không xác định';
          console.error("[Tab 1 Baby] Lỗi upload tệp lẻ:", file.name, errMsg, err);
          this.notification.error('Lỗi tải lên', `Tệp "${file.name}" tải lên thất bại: ${errMsg}`);
          return of(null);
        })
      );
    });

    console.log("[Tab 1 Baby] Gọi API upload đồng thời (forkJoin)...");
    forkJoin(uploadObservables)
      .pipe(finalize(() => {
        console.log("[Tab 1 Baby] Kết thúc upload tài liệu bé (Finalize).");
        this.babyUploading = false;
        this.babyUploadProgress = 0;
      }))
      .subscribe({
        next: (results) => {
          console.log("[Tab 1 Baby] Kết quả upload (forkJoin results):", results);
          const successCount = results.filter(r => r !== null).length;
          if (successCount > 0) {
            console.log(`[Tab 1 Baby] Tải lên thành công ${successCount}/${files.length} tệp.`);
            this.notification.success(
              this.i18n.translate('momApp.common.success'), 
              `Đã tải lên thành công ${successCount}/${files.length} tài liệu của bé.`
            );
            this.loadBabyFiles(this.selectedBabyId!);
            this.fileUploadForm.reset();
          } else {
            console.warn("[Tab 1 Baby] Không có tệp nào tải lên thành công.");
          }
        },
        error: (err) => {
          console.error("[Tab 1 Baby] forkJoin upload bị lỗi nghiêm trọng!", err);
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || 'Tải lên tài liệu bé thất bại. Vui lòng thử lại.'
          );
        }
      });
  }

  // ---- TAB 2: EXCEL IMPORT UPLOAD LOGIC ----
  onExcelDragOver(event: DragEvent): void {
    event.preventDefault();
    this.excelDragOver = true;
  }

  onExcelDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.excelDragOver = false;
  }

  onExcelFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.excelDragOver = false;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.handleExcelFiles(Array.from(files));
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    console.log("[Tab 2 Excel] onExcelFileSelected: Đã chọn file Excel từ Explorer. Files:", files);
    if (!files || files.length === 0) {
      console.warn("[Tab 2 Excel] Explorer không chọn file nào.");
      input.value = '';
      return;
    }
    const filesArray = Array.from(files);
    input.value = '';
    this.handleExcelFiles(filesArray);
  }

  // ---- TAB 3: GENERAL DOCUMENTS UPLOAD LOGIC ----
  onGeneralDragOver(event: DragEvent): void {
    event.preventDefault();
    this.generalDragOver = true;
    console.log("[Tab 3 General] onGeneralDragOver: Đang kéo file qua dropzone chung...");
  }

  onGeneralDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.generalDragOver = false;
    console.log("[Tab 3 General] onGeneralDragLeave: Rời khỏi dropzone chung.");
  }

  onGeneralFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.generalDragOver = false;
    const files = event.dataTransfer?.files;
    console.log("[Tab 3 General] onGeneralFileDrop: Kéo thả tệp chung. Files nhận được:", files);
    if (!files || files.length === 0) {
      console.warn("[Tab 3 General] Danh sách files kéo thả trống.");
      return;
    }
    this.uploadGeneralDocuments(Array.from(files));
  }

  onGeneralFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    console.log("[Tab 3 General] onGeneralFileSelected: Đã chọn tệp chung qua Explorer. Files:", files);
    if (!files || files.length === 0) {
      console.warn("[Tab 3 General] Explorer không có tệp nào được chọn.");
      input.value = '';
      return;
    }
    const filesArray = Array.from(files);
    input.value = '';
    this.uploadGeneralDocuments(filesArray);
  }

  uploadGeneralDocuments(files: File[]): void {
    console.log("[Tab 3 General] Bắt đầu tải lên tài liệu dùng chung gia đình. Files:", files);
    this.generalUploading = true;
    this.generalUploadProgress = 10;

    // Upload tất cả các file cùng lúc
    const uploadObservables = files.map(file => {
      console.log("[Tab 3 General] Chuẩn bị upload tệp chung:", file.name, "size:", file.size, "bytes");
      return this.command.uploadFile(file, 'family-documents').pipe(
        catchError((err) => {
          const errMsg = err?.error?.message || err?.message || 'Lỗi không xác định';
          console.error("[Tab 3 General] Lỗi upload tệp chung lẻ:", file.name, errMsg, err);
          this.notification.error('Lỗi tải lên', `Tệp "${file.name}" tải lên thất bại: ${errMsg}`);
          return of(null);
        })
      );
    });

    console.log("[Tab 3 General] Gọi API upload đồng thời (forkJoin)...");
    forkJoin(uploadObservables)
      .pipe(finalize(() => {
        console.log("[Tab 3 General] Kết thúc quá trình upload tệp chung (Finalize).");
        this.generalUploading = false;
        this.generalUploadProgress = 0;
      }))
      .subscribe({
        next: (results) => {
          console.log("[Tab 3 General] Kết quả upload (forkJoin results):", results);
          const successCount = results.filter(r => r !== null).length;
          if (successCount > 0) {
            console.log(`[Tab 3 General] Tải lên thành công ${successCount}/${files.length} tệp chung.`);
            this.notification.success(
              this.i18n.translate('momApp.common.success'), 
              `Đã tải lên thành công ${successCount}/${files.length} tài liệu dùng chung.`
            );
            this.loadGeneralFiles();
          } else {
            console.warn("[Tab 3 General] Không có tệp chung nào tải lên thành công.");
          }
        },
        error: (err) => {
          console.error("[Tab 3 General] forkJoin upload tệp chung bị lỗi nghiêm trọng!", err);
          this.notification.error(
            this.i18n.translate('common.errorTitle'),
            err?.message || 'Tải lên tài liệu gia đình thất bại. Vui lòng thử lại.'
          );
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

  // ---- MULTI-SELECT WORKFLOWS ----
  toggleBabyMultiSelectMode(): void {
    this.babyMultiSelectMode = !this.babyMultiSelectMode;
    if (!this.babyMultiSelectMode) {
      this.babySelectedFileIds.clear();
    }
  }

  toggleBabyFileSelection(fileId: number): void {
    if (this.babySelectedFileIds.has(fileId)) {
      this.babySelectedFileIds.delete(fileId);
    } else {
      this.babySelectedFileIds.add(fileId);
    }
  }

  isBabyFileSelected(fileId: number): boolean {
    return this.babySelectedFileIds.has(fileId);
  }

  selectAllBabyFiles(): void {
    this.babyFiles.forEach(file => {
      this.babySelectedFileIds.add(file.id);
    });
  }

  downloadSelectedBabyFiles(): void {
    if (this.babySelectedFileIds.size === 0) return;
    const filesToDownload = this.babyFiles.filter(f => this.babySelectedFileIds.has(f.id));
    console.log("[Tab 1 Baby] Tải xuống hàng loạt các tệp tin:", filesToDownload);
    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        this.downloadFile(file);
      }, index * 400);
    });
  }

  deleteSelectedBabyFiles(): void {
    if (this.babySelectedFileIds.size === 0) return;
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa ${this.babySelectedFileIds.size} tệp tin của bé đã chọn? Hành động này không thể khôi phục lại.`,
      nzOkText: 'Xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        console.log("[Tab 1 Baby] Bắt đầu xóa hàng loạt các tệp tin có ID:", Array.from(this.babySelectedFileIds));
        const deleteObservables = Array.from(this.babySelectedFileIds).map(id => this.command.deleteFile(id));
        this.loading = true;
        forkJoin(deleteObservables)
          .pipe(finalize(() => { this.loading = false; }))
          .subscribe({
            next: () => {
              this.notification.success(this.i18n.translate('momApp.common.success'), `Đã xóa thành công ${this.babySelectedFileIds.size} tệp tin.`);
              this.babySelectedFileIds.clear();
              this.babyMultiSelectMode = false;
              this.loadBabyFiles(this.selectedBabyId!);
            },
            error: (err) => {
              console.error("[Tab 1 Baby] Lỗi xóa hàng loạt:", err);
              this.notification.error(this.i18n.translate('common.errorTitle'), err.message || 'Không thể xóa các tệp tin.');
            }
          });
      }
    });
  }

  toggleGeneralMultiSelectMode(): void {
    this.generalMultiSelectMode = !this.generalMultiSelectMode;
    if (!this.generalMultiSelectMode) {
      this.generalSelectedFileIds.clear();
    }
  }

  toggleGeneralFileSelection(fileId: number): void {
    if (this.generalSelectedFileIds.has(fileId)) {
      this.generalSelectedFileIds.delete(fileId);
    } else {
      this.generalSelectedFileIds.add(fileId);
    }
  }

  isGeneralFileSelected(fileId: number): boolean {
    return this.generalSelectedFileIds.has(fileId);
  }

  selectAllGeneralFiles(): void {
    this.generalFiles.forEach(file => {
      this.generalSelectedFileIds.add(file.id);
    });
  }

  downloadSelectedGeneralFiles(): void {
    if (this.generalSelectedFileIds.size === 0) return;
    const filesToDownload = this.generalFiles.filter(f => this.generalSelectedFileIds.has(f.id));
    console.log("[Tab 3 General] Tải xuống hàng loạt các tệp dùng chung:", filesToDownload);
    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        this.downloadFile(file);
      }, index * 400);
    });
  }

  deleteSelectedGeneralFiles(): void {
    if (this.generalSelectedFileIds.size === 0) return;
    this.modalService.confirm({
      nzTitle: 'Xác nhận xóa hàng loạt',
      nzContent: `Bạn có chắc chắn muốn xóa ${this.generalSelectedFileIds.size} tệp tin gia đình đã chọn? Hành động này không thể khôi phục lại.`,
      nzOkText: 'Xóa',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Hủy',
      nzOnOk: () => {
        console.log("[Tab 3 General] Bắt đầu xóa hàng loạt các tệp chung có ID:", Array.from(this.generalSelectedFileIds));
        const deleteObservables = Array.from(this.generalSelectedFileIds).map(id => this.command.deleteFile(id));
        this.loading = true;
        forkJoin(deleteObservables)
          .pipe(finalize(() => { this.loading = false; }))
          .subscribe({
            next: () => {
              this.notification.success(this.i18n.translate('momApp.common.success'), `Đã xóa thành công ${this.generalSelectedFileIds.size} tệp tin dùng chung.`);
              this.generalSelectedFileIds.clear();
              this.generalMultiSelectMode = false;
              this.loadGeneralFiles();
            },
            error: (err) => {
              console.error("[Tab 3 General] Lỗi xóa hàng loạt:", err);
              this.notification.error(this.i18n.translate('common.errorTitle'), err.message || 'Không thể xóa các tệp tin.');
            }
          });
      }
    });
  }

  // ---- HELPER METHODS ----

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

  translateCategoryName(name: string): string {
    if (name && name.startsWith('app.documents.options.')) {
      return this.i18n.translate(name);
    }
    return name;
  }

  formatFileTag(fileTag: string | null, defaultTag: string): string {
    if (!fileTag) return defaultTag;
    if (fileTag.startsWith('baby:')) {
      const parts = fileTag.split(':');
      const babyId = Number(parts[1]);
      const customTag = parts[2];
      const baby = this.babies.find(b => b.id === babyId);
      const babyName = baby ? `bé ${baby.name}` : 'Bé';
      if (customTag) {
        if (customTag.startsWith('app.documents.options.')) {
          return `${this.i18n.translate(customTag)} - ${babyName}`;
        }
        return `${customTag} - ${babyName}`;
      }
      return `Hồ sơ - ${babyName}`;
    }
    return fileTag;
  }
}
