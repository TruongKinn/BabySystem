# Sửa Lỗi Hiển Thị Broken Image Preview Trong Modal AI OCR Receipt Scanner

## 1. Mô tả vấn đề
Trong modal **Trợ lý Quét Hóa đơn AI**, khi người dùng chọn tải lên một tệp tin (đặc biệt là tệp tin định dạng PDF hoặc một số tệp tin hình ảnh có cơ chế xử lý bảo mật URL của Angular), phần preview ở cột bên trái hiển thị một biểu tượng hình ảnh bị lỗi (broken image icon) bên dưới lớp phủ hoạt ảnh quét Laser (`ocr-laser-scanner`).

### Nguyên nhân gốc rễ
1. **Thiếu hỗ trợ định dạng PDF**: Thẻ `<img [src]="ocrPreviewUrl" />` được sử dụng mặc định để hiển thị preview. Khi người dùng tải lên file PDF (vốn được cho phép thông qua thuộc tính `accept="image/*,.pdf"` của thẻ input), trình duyệt không thể render file PDF bằng thẻ `<img>`, dẫn đến việc hiển thị biểu tượng hình ảnh bị lỗi.
2. **Thiếu an toàn kiểu SafeUrl cho iframe**: Để hiển thị preview cho PDF bằng thẻ `<iframe>`, ta cần gán SafeResourceUrl được sinh ra bởi `DomSanitizer.bypassSecurityTrustResourceUrl(objectUrl)`. Tuy nhiên, code cũ chỉ sử dụng `bypassSecurityTrustUrl(objectUrl)` chung cho mọi định dạng.
3. **Rò rỉ bộ nhớ (Memory Leak)**: Các đối tượng Object URL (`URL.createObjectURL(file)`) được tạo ra liên tục mỗi khi người dùng chọn file hoặc mở modal nhưng không được giải phóng thông qua `URL.revokeObjectURL(url)`.

---

## 2. Giải pháp thực hiện

### Backend & i18n
* Không thay đổi vì lỗi hoàn toàn nằm ở phần xử lý render preview của Angular Frontend.
* Đã chạy thành công script biên dịch i18n để đảm bảo tính đồng bộ dữ liệu:
  ```bash
  node codebase/scripts/compile-i18n.js
  ```

### Frontend (`frontend-service`)
Chúng ta tiến hành cập nhật component `expenses` để phân biệt file ảnh và file PDF khi tạo preview:

1. **Cập nhật TypeScript** ([expenses.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.ts)):
   - Khai báo thêm thuộc tính `isOcrPdf` để lưu trạng thái tệp tin có phải là PDF hay không.
   - Khai báo thêm biến private `ocrObjectUrl` để quản lý vòng đời của Object URL được tạo ra.
   - Tạo phương thức hỗ trợ `revokeOcrObjectUrl()` để tự động giải phóng bộ nhớ của Object URL cũ.
   - Cập nhật hàm `closeOcrModal()` để dọn dẹp bộ nhớ và reset các trạng thái preview.
   - Cập nhật hàm `onOcrFileSelected()`: kiểm tra đuôi file xem có phải `.pdf` hay không. Nếu là PDF thì sử dụng `bypassSecurityTrustResourceUrl`, ngược lại sử dụng `bypassSecurityTrustUrl`.

2. **Cập nhật Template HTML** ([expenses.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.html)):
   - Sử dụng cơ chế hiển thị có điều kiện `*ngIf`:
     - Nếu `isOcrPdf` là `true`: Render preview bằng thẻ `<iframe>` trỏ tới `ocrPreviewUrl` được bypass bảo mật tài nguyên (`SafeResourceUrl`).
     - Nếu `isOcrPdf` là `false`: Render preview bằng thẻ `<img>` truyền thống.
   - Hoạt ảnh Laser Quét được phủ lên trên phần tử preview tương ứng một cách tự nhiên.

---

## 3. Kết quả đạt được
* **Hiển thị hoàn hảo**: Tệp tin hình ảnh thông thường hiển thị mượt mà bằng thẻ `<img>`. Tệp tin PDF hiển thị trực tiếp sắc nét thông qua `<iframe>` nhúng nội dung ngay trong khung preview bên trái.
* **Không còn Broken Image**: Loại bỏ hoàn toàn biểu tượng hình ảnh bị lỗi gây mất thẩm mỹ FinTech cao cấp.
* **Tối ưu bộ nhớ**: Các Object URL tạm thời được giải phóng triệt để ngay khi thay đổi file mới hoặc khi đóng modal quét hóa đơn, tránh hiện tượng tràn bộ nhớ trình duyệt của người dùng.
