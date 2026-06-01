import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { SuperAppCommandService, CreateInvoiceRequest, InvoiceResponse } from '../core/services/super-app-command.service';
import { I18nService } from '../i18n/i18n.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    NzButtonModule,
    NzCardModule,
    NzDatePickerModule,
    NzDividerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzSwitchModule,
    NzToolTipModule,
    NzTableModule,
    NzPopconfirmModule
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.css'
})
export class InvoicesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly command = inject(SuperAppCommandService);
  private readonly message = inject(NzMessageService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly i18n = inject(I18nService);

  invoiceForm!: FormGroup;
  isGenerating = false;
  isSaving = false;

  // Trạng thái modal xem trực tiếp PDF
  isViewModalVisible = false;
  safePdfUrl: SafeResourceUrl | null = null;
  isViewLoading = false;

  // Trạng thái xác thực OTP Ký số
  isVerified = false;
  isOtpModalVisible = false;
  otpDigits = ['', '', '', '', '', ''];
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  countdown = 0;
  countdownTimer: any;
  pendingAction: 'save' | 'download' | 'print' | null = null;
  requireOtpForSigning = true;
  generatedOtp = '';

  // Lịch sử hóa đơn
  invoicesList: InvoiceResponse[] = [];
  totalInvoices = 0;
  currentPage = 1;
  pageSize = 5;
  searchKeyword = '';
  isLoadingHistory = false;

  readonly currencies = ['VND', 'USD', 'EUR', 'JPY'];

  ngOnInit(): void {
    this.initForm();
    this.loadInvoiceHistory();
  }

  private initForm(): void {
    const randomNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 15); // Hạn thanh toán sau 15 ngày

    this.invoiceForm = this.fb.group({
      invoiceNo: [randomNo, [Validators.required, Validators.maxLength(50)]],
      issueDate: [today, [Validators.required]],
      dueDate: [dueDate, [Validators.required]],
      currency: ['VND', [Validators.required]],
      sellerName: ['Công ty Gia đình OS', [Validators.required, Validators.maxLength(150)]],
      sellerEmail: ['finance@familyos.com', [Validators.email]],
      sellerPhone: ['0901234567'],
      sellerAddress: ['123 Đường Hạnh Phúc, Quận 1, TP. HCM'],
      buyerName: ['Nguyễn Văn Khách Hàng', [Validators.required, Validators.maxLength(150)]],
      buyerEmail: ['customer@example.com', [Validators.email]],
      buyerPhone: ['0987654321'],
      buyerAddress: ['456 Phố Bình Yên, Quận Hoàn Kiếm, Hà Nội'],
      items: this.fb.array([]),
      discount: [0, [Validators.min(0), Validators.max(100)]],
      vat: [10, [Validators.min(0), Validators.max(100)]],
      notes: [''],
      authorizedSigner: ['Chủ hộ Family OS', [Validators.required, Validators.maxLength(100)]]
    });

    // Thêm sẵn 1 dòng sản phẩm mặc định
    this.addItem();
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(150)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      tax: [0, [Validators.min(0), Validators.max(100)]]
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      this.message.warning(this.i18n.translate('app.invoices.atLeastOneItem') || 'Hóa đơn phải có ít nhất 1 sản phẩm.');
    }
  }

  // Tính thành tiền của từng mặt hàng
  getItemAmount(index: number): number {
    const item = this.items.at(index).value;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const tax = Number(item.tax) || 0;
    const base = qty * price;
    return base + (base * tax) / 100;
  }

  // Tính tổng phụ (Subtotal) chưa tính VAT và Discount tổng
  get subtotal(): number {
    let sum = 0;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i).value;
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      sum += qty * price;
    }
    return sum;
  }

  // Tính giá trị chiết khấu tổng
  get discountAmount(): number {
    const discPercent = Number(this.invoiceForm.get('discount')?.value) || 0;
    return (this.subtotal * discPercent) / 100;
  }

  // Tính giá trị thuế VAT tổng
  get vatAmount(): number {
    const vatPercent = Number(this.invoiceForm.get('vat')?.value) || 0;
    return ((this.subtotal - this.discountAmount) * vatPercent) / 100;
  }

  // Tính tổng thanh toán cuối cùng
  get totalAmount(): number {
    return this.subtotal - this.discountAmount + this.vatAmount;
  }

  // In hóa đơn trực tiếp bằng trình duyệt
  printInvoice(): void {
    if (typeof window === 'undefined') return;
    if (this.invoiceForm.invalid) {
      this.message.error(this.i18n.translate('app.invoices.invalidForm') || 'Vui lòng kiểm tra và điền đầy đủ thông tin hóa đơn hợp lệ.');
      this.markFormGroupDirty(this.invoiceForm);
      this.focusFirstInvalidControl();
      return;
    }
    if (this.requireOtpForSigning && !this.isVerified) {
      this.pendingAction = 'print';
      this.openOtpModal();
      return;
    }
    if (!this.requireOtpForSigning) {
      this.isVerified = true;
    }
    window.print();
  }

  // Sinh PDF và Tải về client-side
  downloadPdf(): void {
    if (typeof window === 'undefined') return;
    if (this.invoiceForm.invalid) {
      this.message.error(this.i18n.translate('app.invoices.invalidForm') || 'Vui lòng kiểm tra và điền đầy đủ thông tin hóa đơn hợp lệ.');
      this.markFormGroupDirty(this.invoiceForm);
      this.focusFirstInvalidControl();
      return;
    }
    if (this.requireOtpForSigning && !this.isVerified) {
      this.pendingAction = 'download';
      this.openOtpModal();
      return;
    }
    if (!this.requireOtpForSigning) {
      this.isVerified = true;
    }
    const element = document.getElementById('invoice-paper');
    if (!element) return;

    this.isGenerating = true;
    html2canvas(element, { scale: 1.5, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const invNo = this.invoiceForm.get('invoiceNo')?.value || 'INV-TEMP';
      pdf.save(`invoice-${invNo}.pdf`);
      this.isGenerating = false;
      this.message.success(this.i18n.translate('momApp.common.success') || 'Thành công!');
    }).catch((err) => {
      console.error('Error generating PDF:', err);
      this.isGenerating = false;
      this.message.error(this.i18n.translate('app.invoices.downloadFailed') || 'Có lỗi xảy ra khi tạo PDF.');
    });
  }

  // Lưu file PDF trực tiếp vào Tài liệu gia đình và đồng bộ xuống Database Backend
  saveToDocuments(): void {
    if (typeof window === 'undefined') return;
    if (this.invoiceForm.invalid) {
      this.message.error(this.i18n.translate('app.invoices.invalidForm') || 'Vui lòng kiểm tra và điền đầy đủ thông tin hóa đơn hợp lệ.');
      this.markFormGroupDirty(this.invoiceForm);
      this.focusFirstInvalidControl();
      return;
    }
    if (this.requireOtpForSigning && !this.isVerified) {
      this.pendingAction = 'save';
      this.openOtpModal();
      return;
    }
    if (!this.requireOtpForSigning) {
      this.isVerified = true;
    }
    const element = document.getElementById('invoice-paper');
    if (!element) return;

    this.isSaving = true;
    html2canvas(element, { scale: 1.5, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const invNo = this.invoiceForm.get('invoiceNo')?.value || 'INV-TEMP';
      const timestamp = Math.floor(Date.now() / 1000);
      const pdfFile = new File([pdfBlob], `invoice-${invNo}-${timestamp}.pdf`, { type: 'application/pdf' });

      // Gửi uploadFile lên backend family-documents trước
      this.command.uploadFile(pdfFile, 'family-documents').subscribe({
        next: (fileMeta) => {
          // Chuẩn bị request lưu hóa đơn xuống Backend
          const formVal = this.invoiceForm.value;
          const payload: CreateInvoiceRequest = {
            familyId: this.command.getFamilyId(),
            invoiceNo: formVal.invoiceNo,
            issueDate: new Date(formVal.issueDate || new Date()).toISOString(),
            dueDate: new Date(formVal.dueDate || new Date()).toISOString(),
            currency: formVal.currency,
            sellerName: formVal.sellerName,
            sellerEmail: formVal.sellerEmail || undefined,
            sellerPhone: formVal.sellerPhone || undefined,
            sellerAddress: formVal.sellerAddress || undefined,
            buyerName: formVal.buyerName,
            buyerEmail: formVal.buyerEmail || undefined,
            buyerPhone: formVal.buyerPhone || undefined,
            buyerAddress: formVal.buyerAddress || undefined,
            discountPercent: Number(formVal.discount) || 0,
            vatPercent: Number(formVal.vat) || 0,
            totalAmount: Number(this.totalAmount) || 0,
            notes: formVal.notes || undefined,
            fileMetadataId: String(fileMeta.id),
            authorizedSigner: formVal.authorizedSigner,
            isDigitallySigned: this.isVerified && this.requireOtpForSigning,
            signatureOtp: this.isVerified && this.requireOtpForSigning ? this.generatedOtp : undefined,
            signedAt: this.isVerified && this.requireOtpForSigning ? new Date().toISOString() : undefined,
            items: formVal.items.map((it: any) => ({
              name: it.name ? it.name.trim() : 'Sản phẩm',
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
              tax: Number(it.tax) || 0
            }))
          };

          // Lưu hóa đơn vào cơ sở dữ liệu
          this.command.createInvoice(payload).subscribe({
            next: () => {
              this.isSaving = false;
              this.isVerified = false; // Reset trạng thái ký số cho lần tiếp theo
              this.message.success(this.i18n.translate('app.invoices.saveSuccess'));
              
              // Tạo mã số hóa đơn ngẫu nhiên mới cho lần nhập tiếp theo
              const randomNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);
              this.invoiceForm.patchValue({
                invoiceNo: randomNo,
                authorizedSigner: 'Chủ hộ Family OS'
              });
              // Reset items về 1 sản phẩm trống
              while (this.items.length > 0) {
                this.items.removeAt(0);
              }
              this.addItem();

              // Reload lịch sử hóa đơn
              this.loadInvoiceHistory();
            },
            error: (err) => {
              this.isSaving = false;
              this.message.error(err?.error?.message || this.i18n.translate('app.invoices.saveFailed'));
            }
          });
        },
        error: (err) => {
          this.isSaving = false;
          this.message.error(err?.error?.message || this.i18n.translate('app.invoices.saveFailed'));
        }
      });
    }).catch((err) => {
      console.error('Error saving to documents:', err);
      this.isSaving = false;
      this.message.error(this.i18n.translate('app.invoices.saveFailed'));
    });
  }

  // Tải danh sách lịch sử hóa đơn từ Backend
  loadInvoiceHistory(): void {
    this.isLoadingHistory = true;
    this.command.getInvoices(this.currentPage - 1, this.pageSize, this.searchKeyword).subscribe({
      next: (res) => {
        this.invoicesList = res.items || [];
        this.totalInvoices = res.total || 0;
        this.isLoadingHistory = false;
      },
      error: (err) => {
        console.error('Error loading invoices history:', err);
        this.isLoadingHistory = false;
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadInvoiceHistory();
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadInvoiceHistory();
  }

  // Xem trực tiếp PDF của hóa đơn đã lưu trong modal popup (Inline View)
  viewInvoicePdf(fileMetadataId: string): void {
    if (!fileMetadataId) return;
    this.isViewLoading = true;
    this.isViewModalVisible = true;
    this.safePdfUrl = null;
 
    this.command.getFileDownloadUrl(Number(fileMetadataId), 'inline').subscribe({
      next: (url) => {
        if (url) {
          this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        }
        this.isViewLoading = false;
      },
      error: (err) => {
        console.error('Error fetching download URL:', err);
        this.message.error(this.i18n.translate('momApp.common.error') || 'Có lỗi xảy ra.');
        this.isViewLoading = false;
        this.isViewModalVisible = false;
      }
    });
  }
 
  closeViewModal(): void {
    this.isViewModalVisible = false;
    this.safePdfUrl = null;
  }

  // Xóa hóa đơn đồng bộ cả DB Backend và file đính kèm
  deleteInvoice(id: number, fileMetadataId?: string): void {
    this.command.deleteInvoice(id).subscribe({
      next: () => {
        this.message.success(this.i18n.translate('app.invoices.deleteSuccess') || 'Xóa hóa đơn thành công!');
        
        // Dọn dẹp cả file PDF tương ứng ở file-service
        if (fileMetadataId) {
          this.command.deleteFile(Number(fileMetadataId)).subscribe({
            error: (err) => console.error('Error deleting associated PDF file:', err)
          });
        }
        
        // Load lại danh sách
        this.loadInvoiceHistory();
      },
      error: (err) => {
        console.error('Error deleting invoice:', err);
        this.message.error(err?.error?.message || this.i18n.translate('app.invoices.deleteFailed') || 'Xóa hóa đơn thất bại.');
      }
    });
  }

  private markFormGroupDirty(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupDirty(control);
      } else {
        control.markAsDirty();
        control.updateValueAndValidity();
      }
    });
  }

  // ==========================================================================
  // Xử lý OTP Ký Số Điện Tử (Digital Signature Verify)
  // ==========================================================================
  openOtpModal(): void {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.generatedOtp = randomOtp;
    this.isOtpModalVisible = true;
    this.otpDigits = ['', '', '', '', '', ''];
    this.startCountdown();
    this.focusFirstOtpInput();
 
    // Gửi notification thật vào hệ thống Family OS
    this.command.createNotification({
      userId: this.command.getUserId(),
      title: 'MÃ OTP XÁC THỰC KÝ SỐ - FAMILY OS',
      message: `Mã OTP xác thực ký số cho hóa đơn ${this.invoiceForm.value.invoiceNo} của bạn là: ${randomOtp}. Mã có hiệu lực trong 60 giây.`,
      type: 'EXPENSE'
    }).subscribe({
      next: () => {
        this.message.success('Mã OTP xác thực đã được gửi tới hệ thống thông báo gia đình!');
      },
      error: (err) => {
        console.error('Failed to send OTP notification:', err);
        this.message.warning(`Không thể kết nối notification-service. Mã OTP của bạn là: ${randomOtp}`);
      }
    });
  }
 
  closeOtpModal(): void {
    this.isOtpModalVisible = false;
    this.pendingAction = null;
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  }
 
  startCountdown(): void {
    this.countdown = 60;
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.countdownTimer = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        clearInterval(this.countdownTimer);
      }
    }, 1000);
  }
 
  resendOtp(): void {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.generatedOtp = randomOtp;
    this.otpDigits = ['', '', '', '', '', ''];
    this.startCountdown();
    this.focusFirstOtpInput();
 
    this.command.createNotification({
      userId: this.command.getUserId(),
      title: 'MÃ OTP XÁC THỰC KÝ SỐ - FAMILY OS',
      message: `Mã OTP mới xác thực ký số cho hóa đơn ${this.invoiceForm.value.invoiceNo} của bạn là: ${randomOtp}. Vui lòng không chia sẻ mã này.`,
      type: 'EXPENSE'
    }).subscribe({
      next: () => {
        this.message.success('Đã gửi lại mã OTP mới tới hệ thống thông báo!');
      },
      error: (err) => {
        console.error('Failed to resend OTP notification:', err);
        this.message.warning(`Đã sinh lại mã OTP mới! Mã của bạn: ${randomOtp}`);
      }
    });
  }
 
  verifyOtp(): void {
    const otp = this.otpDigits.join('');
    if (otp.length < 6) {
      this.message.warning('Vui lòng nhập đủ 6 chữ số OTP.');
      return;
    }

    if (otp === this.generatedOtp) {
      this.isVerified = true;
      this.isOtpModalVisible = false;
      this.message.success('Ký số điện tử thành công! Dấu mộc Family Verify đã được kích hoạt.');
      
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
      }
 
      // Tiếp tục thực hiện hành động đang chờ
      const action = this.pendingAction;
      this.pendingAction = null;
      
      setTimeout(() => {
        if (action === 'save') {
          this.saveToDocuments();
        } else if (action === 'download') {
          this.downloadPdf();
        } else if (action === 'print') {
          this.printInvoice();
        }
      }, 500);
    } else {
      this.message.error('Mã OTP không chính xác. Vui lòng kiểm tra lại trong chuông thông báo.');
    }
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.trim();

    // Lọc bỏ mọi ký tự không phải số
    val = val.replace(/\D/g, '');

    // Nếu có độ dài lớn hơn 0, chỉ lấy ký tự cuối cùng (chế độ đè phím)
    if (val.length > 0) {
      val = val.charAt(val.length - 1);
    }

    input.value = val;
    this.otpDigits[index] = val;

    // Chuyển focus sang ô tiếp theo bất đồng bộ bằng setTimeout để tránh rò rỉ phím sang ô mới
    if (val && index < 5) {
      const inputsArray = this.otpInputs.toArray();
      const nextInput = inputsArray[index + 1]?.nativeElement;
      if (nextInput) {
        setTimeout(() => {
          nextInput.focus();
          nextInput.select();
        }, 10);
      }
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    const inputsArray = this.otpInputs.toArray();

    // 1. Xử lý khi nhấn Backspace
    if (event.key === 'Backspace') {
      event.preventDefault(); // Ngăn chặn hành vi mặc định để tự kiểm soát

      if (input.value) {
        // Nếu ô hiện tại có giá trị, xóa giá trị của nó
        input.value = '';
        this.otpDigits[index] = '';
      } else if (index > 0) {
        // Nếu ô hiện tại trống, xóa giá trị của ô trước đó và quay về ô trước
        this.otpDigits[index - 1] = '';
        const prevInput = inputsArray[index - 1]?.nativeElement;
        if (prevInput) {
          prevInput.value = '';
          setTimeout(() => {
            prevInput.focus();
            prevInput.select();
          }, 10);
        }
      }
      return;
    }

    // 2. Cho phép di chuyển trái/phải bằng phím mũi tên
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      const prevInput = inputsArray[index - 1]?.nativeElement;
      if (prevInput) {
        setTimeout(() => {
          prevInput.focus();
          prevInput.select();
        }, 10);
      }
      return;
    }
    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      const nextInput = inputsArray[index + 1]?.nativeElement;
      if (nextInput) {
        setTimeout(() => {
          nextInput.focus();
          nextInput.select();
        }, 10);
      }
      return;
    }

    // 3. Cho phép các phím chức năng và phím tắt thông thường
    const allowedKeys = ['Tab', 'Delete', 'Enter', 'Escape'];
    
    // Cho phép paste (Ctrl + V / Cmd + V)
    if ((event.ctrlKey || event.metaKey) && (event.key === 'v' || event.key === 'V')) {
      return;
    }
    // Cho phép copy (Ctrl + C / Cmd + C)
    if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C')) {
      return;
    }
    // Cho phép chọn tất cả (Ctrl + A / Cmd + A)
    if ((event.ctrlKey || event.metaKey) && (event.key === 'a' || event.key === 'A')) {
      return;
    }

    // Chặn tất cả các phím ký tự chữ cái và ký tự đặc biệt khác phím số
    const isDigit = event.key >= '0' && event.key <= '9';
    if (!isDigit && allowedKeys.indexOf(event.key) === -1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const digits = pasteData.trim().replace(/\D/g, '').slice(0, 6);
    const inputsArray = this.otpInputs.toArray();

    for (let i = 0; i < 6; i++) {
      if (i < digits.length) {
        this.otpDigits[i] = digits[i];
        const inputEl = inputsArray[i]?.nativeElement;
        if (inputEl) {
          inputEl.value = digits[i];
        }
      }
    }

    const focusIndex = Math.min(digits.length, 5);
    const focusInput = inputsArray[focusIndex]?.nativeElement;
    if (focusInput) {
      setTimeout(() => {
        focusInput.focus();
        focusInput.select();
      }, 10);
    }
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  focusFirstOtpInput(): void {
    setTimeout(() => {
      const inputsArray = this.otpInputs?.toArray() || [];
      const firstInput = inputsArray[0]?.nativeElement;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 150);
  }

  private focusFirstInvalidControl(): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      const firstInvalidElement = document.querySelector(
        'input.ng-invalid, nz-select.ng-invalid, nz-date-picker.ng-invalid, textarea.ng-invalid'
      ) as HTMLElement;
      
      if (firstInvalidElement) {
        const inputInside = firstInvalidElement.querySelector('input') as HTMLElement;
        if (inputInside) {
          inputInside.focus();
        } else {
          firstInvalidElement.focus();
        }
        firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}
