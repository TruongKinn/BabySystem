# Tài liệu Kỹ thuật - Sửa lỗi i18n và tối ưu hóa Responsive Modal OCR

Tài liệu này đặc tả chi tiết về việc khắc phục lỗi hiển thị dịch thuật i18n dạng raw key, bổ sung các key i18n còn thiếu, nâng cấp trường DatePicker chuẩn NG-ZORRO (Ant Design) và tối ưu hóa responsive, chống tràn màn hình, chống vỡ nhãn cho Modal OCR Receipt Scanner trên frontend của hệ thống BabySystem.

---

## 1. Vấn đề phát sinh & Phân tích nguyên nhân (Root Cause Analysis)

### A. Lỗi hiển thị i18n dạng raw key & thiếu i18n
- **Biểu hiện 1**: Khi AI đang quét hoặc khi hoàn tất trích xuất, thông báo Toast hiển thị dạng raw key như `momApp.expenses.ocr.ocrSuccess`, `momApp.expenses.ocr.ocrError`...
- **Biểu hiện 2**: Nhiều nhãn nháp (như `Ngày giao dịch`), các placeholder nháp (`Chọn hoặc nhập danh mục`, `Nhập ghi chú chi tiêu...`), nút bấm `Hủy` và nhãn `Độ tin cậy AI` bị cứng tiếng Việt hoặc dùng lẫn lộn với modal chi tiêu cũ gây khó khăn cho việc đa ngôn ngữ hóa.
- **Nguyên nhân**:
  1. Script compile dịch thuật `compile-i18n.js` gộp các file dịch con của route `app/expenses` vào file cha dưới route tương ứng của nó là `app.expenses`. Việc gọi sai prefix `momApp.expenses` trong TS dẫn đến không tìm thấy bản dịch.
  2. Modal đối soát OCR chưa được thiết kế hệ thống key dịch thuật chuyên biệt riêng, mà sử dụng một số nhãn cứng tiếng Việt hoặc gộp chung với modal chi tiêu cũ, dẫn đến việc thiếu đồng bộ i18n cho cả 4 ngôn ngữ (Vi, En, Zh, Ja).

### B. Lỗi vỡ giao diện & Chưa Responsive (Vỡ nhãn DANH MỤC và NGÀY GIAO DỊCH)
- **Biểu hiện**: Modal bị tràn ngang khỏi màn hình ở các thiết bị di động, tablet hoặc laptop có độ phân giải nhỏ hơn 1080px. Đặc biệt, nhãn "DANH MỤC" và "NGÀY GIAO DỊCH" bị co ép chiều rộng và ngắt dọc xuống dòng thành `"DANH \n MỤC"` và `"NGÀY \n GIAO \n DỊCH"` trông rất thiếu thẩm mỹ.
- **Nguyên nhân**:
  1. Thẻ `<nz-modal>` bị cấu hình cứng thuộc tính `[nzWidth]="1080"`, ép chiều rộng modal luôn là 1080px bất kể kích thước màn hình.
  2. Bố cục `.ocr-scanner-layout` sử dụng grid 2 cột cố định với breakpoint responsive cũ ở `768px`, quá muộn đối với một modal rộng 1080px.
  3. Chiều rộng của form panel bên phải khá hẹp. Việc nhồi nhét hai trường Danh mục và Ngày giao dịch chung một hàng bằng grid 2 cột `1.2fr 1fr` làm diện tích thực tế cho label bị chèn ép nặng nề, dẫn đến vỡ dòng chữ.
  4. Chiều cao tối thiểu của panel preview (`min-height: 420px`) và dropzone quá lớn trên mobile, làm tổng chiều cao modal vượt quá màn hình dọc, gây khó khăn cho việc cuộn và thao tác.

### C. Sử dụng Input Date Thô (Chưa chuẩn Ant Design)
- **Biểu hiện**: Trường "Ngày giao dịch" sử dụng thẻ `<input type="date">` thô của trình duyệt, có giao diện chọn ngày lỗi thời và không đồng điệu với hệ thống thiết kế NG-ZORRO (Ant Design) của các trang khác trong hệ thống.

---

## 2. Giải pháp kỹ thuật đã triển khai (Implemented Solutions)

### A. Tái cấu trúc Layout Form Đối soát - Chống vỡ chữ Label
- **Giải pháp**: Chúng tôi đã loại bỏ layout grid 2 cột `1.2fr 1fr` chung hàng của trường Danh mục và Ngày giao dịch tại dòng 1208 trong [expenses.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.html).
- **Kết quả**: Cả 4 trường của form (Số tiền, Danh mục, Ngày giao dịch, Ghi chú) được xếp dọc (cột đơn) trực tiếp trong grid `.user-modal-form-grid`. Nhờ đó, mỗi trường đều chiếm trọn 100% chiều rộng của form panel, giúp chữ nhãn có không gian hiển thị rộng rãi, trải dài trên một hàng ngang tuyệt đẹp và không bao giờ bị ngắt dòng mất thẩm mỹ như trước.

### B. Nâng cấp lên nz-date-picker Chuẩn NG-ZORRO (Ant Design)
Để tạo trải nghiệm Premium đồng bộ theo đúng tinh thần **Web Design Backbone Rule**, chúng tôi đã thực hiện:
1. **Trong HTML**: Thay thế `<input nz-input type="date" formControlName="date" />` bằng component chính thức của NG-ZORRO:
   ```html
   <nz-date-picker formControlName="date" style="width: 100%; border-radius: 8px; height: 38px;" [nzFormat]="'yyyy-MM-dd'"></nz-date-picker>
   ```
   *Hiệu quả*: Hiển thị ô chọn ngày cực kỳ hiện đại, đồng bộ màu cam/hồng ấm áp của User Role và có lịch popup mượt mà. Cấu hình `style="width: 100%; border-radius: 8px; height: 38px;"` giúp nó kéo giãn hết chiều rộng và cao bằng các ô input khác.
2. **Trong TypeScript**: Cập nhật logic reset form trong [expenses.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.ts) để tương thích hoàn toàn với DatePicker (tránh lỗi ng-zorro cũ yêu cầu kiểu Date thay vì chuỗi):
   - Khi đóng modal (`closeOcrModal()`): Reset trường `date` về `null` thay vì chuỗi rỗng `''`.
   - Khi nhận kết quả OCR (`onOcrFileSelected()`): Khởi tạo và gán đối tượng `new Date(ocrResult.date)` thay vì chuỗi thô.

### C. Bổ sung i18n chuyên biệt cho OCR trong 4 Ngôn ngữ
Chúng tôi đã bổ sung đầy đủ **9 key dịch thuật mới** vào namespace `ocr` trong các file dịch con `public/i18n/app/expenses/` (`vi.json`, `en.json`, `zh.json`, `ja.json`):
- `amountLabel`: "Số tiền" / "Amount" / "金额" / "金額"
- `categoryLabel`: "Danh mục" / "Category" / "类别" / "カテゴリー"
- `categoryPlaceholder`: "Chọn hoặc nhập danh mục" / "Select or enter category" / "选择或输入类别" / "カテゴリーを選択または入力"
- `dateLabel`: "Ngày giao dịch" / "Transaction Date" / "交易日期" / "取引日"
- `noteLabel`: "Ghi chú" / "Note" / "备注" / "メモ"
- `notePlaceholder`: "Nhập ghi chú chi tiêu..." / "Enter expense notes..." / "输入支出备注..." / "支出メモを入力..."
- `confidence`: "Độ tin cậy AI" / "AI Confidence" / "AI 可信度" / "AI 信頼度"
- `extractedItemsTitle`: "Danh sách mặt hàng trích xuất:" / "Extracted items list:" / "提取的商品列表:" / "抽出された商品リスト:"
- `cancelBtn`: "Hủy" / "Cancel" / "取消" / "キャンセル"

Đồng thời, đã thay thế toàn bộ label tiếng Việt cứng và các key cũ trong file HTML `expenses.component.html` bằng các key i18n OCR chuyên biệt này.

### D. Đồng bộ hóa i18n & Sửa lỗi logic TS
Chúng tôi đã cập nhật 4 vị trí gọi dịch thuật trong file [expenses.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.ts) sang prefix chuẩn:
- `momApp.expenses.ocr.ocrSuccess` ➡️ `app.expenses.ocr.ocrSuccess`
- `momApp.expenses.ocr.ocrError` ➡️ `app.expenses.ocr.ocrError`
- `momApp.expenses.ocr.uploadError` ➡️ `app.expenses.ocr.uploadError`
- `momApp.expenses.ocr.saveSuccess` ➡️ `app.expenses.ocr.saveSuccess`

Đã chạy script đồng bộ:
```bash
node codebase/scripts/compile-i18n.js
```

### E. Tái cấu trúc CSS Responsive & Premium Glassmorphism
Chúng tôi đã áp dụng các quy chuẩn trong **Web Design Backbone Rule** để tối ưu CSS trong [expenses.component.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.css):
- **Chống tràn ngang modal (Anti-Overflow)**: Ghi đè CSS toàn cục cho class của modal `.ocr-scanner-modal` giới hạn `max-width: 95vw !important` và `width: 1080px !important`.
- **Chuyển đổi Breakpoint thông minh (992px)**: Nâng breakpoint chuyển sang cột đơn từ `768px` lên `992px`.
- **Điều chỉnh Chiều cao Động (Fluid Height Control)**: Trên màn hình nhỏ dưới `992px`, ta khống chế chiều cao của các panel: preview ảnh tối thiểu `280px`, ảnh `.ocr-image-preview` tối đa `300px`, và cột Form `.ocr-form-panel` tự co giãn tự nhiên (`max-height: none !important`, `overflow-y: visible !important`).

---

## 3. Kết quả nghiệm thu

- **Biên dịch Frontend**: Build thành công sạch lỗi 100% bằng Angular Production Build.
- **Trường Chọn Ngày**: Sử dụng `<nz-date-picker>` Ant Design cao cấp, đồng bộ visual, lịch chọn ngày sang xịn mịn 100%.
- **Dịch thuật (i18n)**: 100% các nhãn và placeholder trong form đối soát OCR được dịch chuẩn xác, tự động thay đổi theo ngôn ngữ của hệ thống.
- **Bố cục (Responsive & Aesthetics)**: Form đối soát OCR thoáng đãng, nhãn dài hiển thị trọn vẹn trên một hàng ngang cực kỳ Premium, không có hiện tượng vỡ chữ. Giao diện co dãn mượt mà trên iPhone, iPad và Laptop nhỏ mà không bị vỡ bố cục hay tràn ngang.
