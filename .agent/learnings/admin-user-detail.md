# Admin User Detail

> Tổng hợp kiến thức về việc xây dựng Màn hình Admin quản lý chi tiết người dùng Bento Grid Modal trong dự án.
> Cập nhật lần cuối: 2026-05-18

---

## Architecture

### Modal chi tiết Bento Grid tích hợp liên kết API đa Microservice
- **Ngày**: 2026-05-18
- **Chi tiết**: Xây dựng sub-component standalone `AdminUserDetailModalComponent` giúp chia sẻ tài nguyên, độc lập logic với màn hình danh sách cha. Modal này tích hợp lazy loading song song: tải chi tiết user từ Auth Service (`GET /auth/account/user/{id}`), gia đình từ Account Service (`GET /account/users/{id}/families`), và em bé từ Baby Service (`GET /baby/babies?familyId={id}`) thông qua API Gateway.
- **Files liên quan**: `src/app/admin/users/detail-modal/admin-user-detail-modal.component.ts`, `src/app/admin/users/admin-users.component.ts`

---

## Bugs & Solutions

### Tránh lỗi biên dịch option nzComponentParams của NzModalService và import NzMessageModule
- **Ngày**: 2026-05-18
- **Vấn đề**: (1) `nzComponentParams` không tương thích với một số phiên bản NG-ZORRO gây lỗi TS2353. (2) `NzMessageModule` không xuất trực tiếp từ `'ng-zorro-antd/message'` gây lỗi TS2305. (3) `nz-dropdownMenu` của `NzDropDownModule` gặp lỗi directive 'nzDropdownMenu' không được nhận diện tĩnh statically.
- **Root cause**: Sự khác biệt phiên bản NG-ZORRO ở frontend và việc component standalone import dư thừa các module dịch vụ không chứa element directive (như message).
- **Fix**: 
  1. Khởi tạo modal trơn và gán dữ liệu cho `@Input` của component con động qua `getContentComponent()` sau khi khởi tạo modal.
  2. Loại bỏ `NzMessageModule` khỏi imports, chỉ tiêm `NzMessageService` vào constructor.
  3. Thay thế giao diện dropdown đổi vai trò thành `<nz-select>` bo tròn vừa nâng cao UX và loại bỏ lỗi biên dịch của `NzDropDownModule`.
- **Files liên quan**: `src/app/admin/users/detail-modal/admin-user-detail-modal.component.ts`, `src/app/admin/users/admin-users.component.ts`, `src/app/admin/users/detail-modal/admin-user-detail-modal.component.html`

### Lỗi HttpErrorResponse 200 OK nhưng ok: false khi dùng hardcode /api ở local
- **Ngày**: 2026-05-18
- **Vấn đề**: Gọi API ở local trả về lỗi `HttpErrorResponse` với status `200 OK` nhưng `ok: false` và nhảy vào nhánh catchError/error.
- **Root cause**: Hardcode `apiBase = '/api'` trong modal component khiến request chạy qua port 4200 (dev server). Vì dev server không có proxy chuyển tiếp `/api`, nó tự động trả về tệp `index.html` của Angular SPA dưới dạng HTML thô (với code 200 OK). HttpClient cố gắng parse HTML thành JSON nên sinh lỗi parse thất bại.
- **Fix**: Import `API_CONFIG` và đổi `apiBase = API_CONFIG.GATEWAY_URL` để gọi trực tiếp đến API Gateway cổng backend mà không chạy qua dev server proxy lỗi.
- **Files liên quan**: `src/app/admin/users/detail-modal/admin-user-detail-modal.component.ts`

### Lỗi 403 Forbidden khi Admin lấy danh sách gia đình của user khác
- **Ngày**: 2026-05-18
- **Vấn đề**: Gọi `GET /account/users/{id}/families` trả về `403 Forbidden` khi Admin đang xem chi tiết một user khác.
- **Root cause**: Backend `account-service` thực hiện kiểm tra cô lập dữ liệu (data isolation) tại `validateUserAccessIfContextPresent` để so sánh `userId` được yêu cầu có trùng với `currentUserId` từ `UserContext` hay không. Khi Admin (ID 1) truy cập tài nguyên của User (ID 9223), điều kiện này bị vi phạm và ném ra `AccessDeniedException`.
- **Fix**: 
  1. Xây dựng endpoint Admin chuyên dụng ở backend: `GET /admin/users/{id}/families` trong `AccountController.java` và phương thức `getUserFamiliesForAdmin(userId)` trong `AccountService.java`. Endpoint này chỉ gọi `ensureRequestAuthenticated()` để đảm bảo Admin đã đăng nhập và bypass việc so sánh trùng ID.
  2. Cập nhật frontend gọi đến endpoint admin mới, đồng thời định nghĩa và unwrap `ApiEnvelope<Family[]>` để trích xuất `res.data || []` chính xác vì các API Gateway trả về cấu trúc bọc dữ liệu, khắc phục lỗi undefined length ở runtime.
- **Files liên quan**: `src/app/admin/users/detail-modal/admin-user-detail-modal.component.ts`, `AccountController.java`, `AccountService.java`

---

## How-To

### Cách mở Modal chi tiết User Bento Grid từ Table cha
- **Ngày**: 2026-05-18
- **Bước thực hiện**:
  1. Thêm nút "Xem chi tiết" với class `.btn-detail-view` vào dòng của bảng trong template HTML.
  2. Import `NzModalService` và component con `AdminUserDetailModalComponent` vào file component `.ts` cha.
  3. Viết hàm `openUserDetailModal(user)` gọi `this.modalService.create({...})`, lấy instance qua `modal.getContentComponent()`, gán dữ liệu user, và subscribe `afterClose` để reload danh sách.
- **Files liên quan**: `src/app/admin/users/admin-users.component.ts`, `src/app/admin/users/admin-users.component.html`

---

## Patterns

### Thiết kế Bento Grid kết hợp Inline Form Editing
- **Ngày**: 2026-05-18
- **Chi tiết**: Giao diện Bento Grid phân chia không gian tối ưu cho 3 khối (Thông tin tài khoản, Gia đình, Em bé). Cho phép chỉnh sửa trực tuyến (inline editing) thông tin em bé bằng cách thay thế view-mode metric thành edit-mode form dựa trên cờ trạng thái `baby.isEditing`.
- **Ví dụ code**:
  ```html
  <div class="baby-card" [class.editing]="baby.isEditing">
    <ng-container *ngIf="!baby.isEditing">
      <!-- View mode -->
    </ng-container>
    <ng-container *ngIf="baby.isEditing">
      <!-- Form edit mode -->
    </ng-container>
  </div>
  ```
- **Files liên quan**: `src/app/admin/users/detail-modal/admin-user-detail-modal.component.html`, `src/app/admin/users/detail-modal/admin-user-detail-modal.component.css`
