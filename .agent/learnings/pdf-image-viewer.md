# PDF & Image Document Viewer

> Tổng hợp kiến thức về giải pháp xem tệp tin trực tiếp (inline view) cho PDF và Hình ảnh trong dự án.
> Cập nhật lần cuối: 2026-05-18

---

## Architecture

### Presigned URL & Safe Resource Embedding
- **Ngày**: 2026-05-18
- **Chi tiết**: Sử dụng Presigned URL từ MinIO Object Storage để nhúng tệp trực tiếp vào giao diện Frontend mà không cần gửi JWT Authorization header (vì iframe/img không hỗ trợ dễ dàng). Presigned URL chứa chữ ký bảo mật sẵn có thời hạn ngắn (15 phút), cho phép Frontend nhúng trực tiếp an toàn.
- **Files liên quan**: `codebase/backend/file-service/src/main/java/com/mom/file/service/FileService.java`, `codebase/frontend/src/app/core/services/super-app-command.service.ts`

---

## Bugs & Solutions

### Trình duyệt ép tải xuống thay vì hiển thị trực tiếp (Inline View)
- **Ngày**: 2026-05-18
- **Vấn đề**: Khi Frontend gọi link presigned của PDF, trình duyệt tự động kích hoạt tải xuống file thay vì mở nội dung.
- **Root cause**: S3/MinIO phản hồi không chứa header `Content-Disposition: inline` hoặc bị cấu hình mặc định là `attachment`.
- **Fix**: Nâng cấp Backend nạp chồng phương thức `getDownloadUrl` nhận tham số `disposition`. Sử dụng `extraQueryParams(Map.of("response-content-disposition", disposition))` của MinIO Client để ép phản hồi là `inline`.
- **Files liên quan**: `codebase/backend/file-service/src/main/java/com/mom/file/service/FileService.java`, `codebase/backend/file-service/src/main/java/com/mom/file/controller/FileController.java`

---

## How-To

### Tích hợp Trình xem tài liệu trực tiếp trong Angular
- **Ngày**: 2026-05-18
- **Bước thực hiện**:
  1. **Backend**: Cung cấp API sinh Presigned URL ép `inline` qua tham số `disposition=inline`.
  2. **Frontend Service**: Khai báo method `getFileViewUrl()` gọi endpoint download-url với params `disposition=inline`.
  3. **Component TS**: Import `DomSanitizer` và `SafeResourceUrl`. Nhận URL từ Service, gọi `sanitizer.bypassSecurityTrustResourceUrl(url)` để vượt qua cơ chế chặn bảo mật Angular.
  4. **Component HTML**: Dùng `iframe` cho PDF và `img` cho ảnh, nhúng biến SafeResourceUrl vừa tạo vào thuộc tính `[src]`.
- **Files liên quan**: `codebase/frontend/src/app/expenses/expenses.component.ts`, `codebase/frontend/src/app/expenses/expenses.component.html`

---

## Patterns

### Premium Responsive Modal & Viewport-relative Sizing
- **Ngày**: 2026-05-18
- **Chi tiết**: Thiết lập kích thước modal xem tài liệu lớn (`[nzWidth]="1200"`) và sử dụng đơn vị tương đối `vh` (viewport height) cho chiều cao của vùng nội dung (`height: 80vh`, `max-height: 82vh`). Cách này giúp vùng hiển thị tự động co giãn to rõ theo kích thước màn hình thiết bị thực tế của người dùng, mang lại trải nghiệm Fintech cao cấp.
- **Files liên quan**: `codebase/frontend/src/app/expenses/expenses.component.html`, `codebase/frontend/src/app/expenses/expenses.component.css`
