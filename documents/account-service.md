# TÀI LIỆU KỸ THUẬT - ACCOUNT SERVICE
*(Hệ thống quản lý hộ gia đình & thành viên dành cho Quản trị viên - Admin Family & Member Management)*

Tài liệu này mô tả chi tiết các lỗi hệ thống đã được khắc phục, thiết kế giải pháp và hướng dẫn vận hành/phát triển các tính năng Quản lý Hộ gia đình và Thành viên của Admin qua cổng Gateway.

---

## 1. Các lỗi hệ thống đã khắc phục (Fixed Issues)

### 1.1 Lỗi 403 Forbidden khi Admin tạo Hộ Gia Đình
- **Nguyên nhân**: Request POST tạo gia đình từ frontend gửi đến `POST /account/families` bị API Gateway chặn lại với mã lỗi 403 Forbidden. Endpoint này vốn được thiết kế cho người dùng thông thường và bị ràng buộc bởi các filter phân quyền nội bộ chặt chẽ của người dùng thường, dẫn đến việc Admin bị chặn do không có gia đình tương ứng.
- **Giải pháp xử lý**:
  - Tách biệt hoàn toàn API dành cho Quản trị viên. Tạo mới API chuyên biệt cho Admin: `POST /account/admin/families`.
  - Cập nhật [AccountController.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/account-service/src/main/java/com/mom/account/controller/AccountController.java) để tiếp nhận API Admin này:
    ```java
    @PostMapping("/admin/families")
    public ApiEnvelope<FamilyApi> createFamilyByAdmin(@Valid @RequestBody CreateFamilyRequest request) {
        return ApiEnvelope.ok(accountService.createFamily(request));
    }
    ```
  - Tạo tệp SQL migration [V18__admin_family_create_permission.sql](file:///d:/AI-AGENT/BabySystem/codebase/backend/authentication-service/src/main/resources/db/migration/V18__admin_family_create_permission.sql) đăng ký phân quyền `API:POST:ADMIN_FAMILY_CREATE` cho API `/account/admin/families` và gán cho các vai trò `ADMIN` và `OWNER`.
  - Cập nhật frontend để chuyển request tạo hộ gia đình sang endpoint admin mới này.

### 1.2 Lỗi 404 Not Found khi Gateway tải thông tin Gia đình của Người dùng
- **Nguyên nhân**: Trong [ApiPermissionFilter.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/api-gateway/src/main/java/vn/logistic/apigateway/config/ApiPermissionFilter.java) ở API Gateway, bộ lọc gọi nội bộ đến `account-service` qua đường dẫn `/api/users/{userId}/families`. Tuy nhiên, `account-service` chỉ ánh xạ trực tiếp `/users/{userId}/families` (không có tiền tố `/api`), gây lỗi 404 và làm Gateway không thể xác định danh sách gia đình để phân quyền.
- **Giải pháp xử lý**:
  - Chỉnh sửa dòng 168 trong `ApiPermissionFilter.java`, loại bỏ `/api` dư thừa để Gateway gọi chính xác `/users/{userId}/families`.

---

## 2. Thiết kế tính năng Quản lý thành viên dành cho Admin (CRUD Members)

Để đáp ứng đầy đủ yêu cầu "phải thêm, xóa, sửa được thành viên hộ gia đình từ trang quản trị", chúng ta đã tích hợp một hệ thống quản lý thành viên toàn diện, an toàn và có giao diện Premium.

### 2.1 Backend Support (API Account-Service qua Gateway)

Các API sau đây được gọi thông qua API Gateway để thực hiện CRUD thành viên:

1. **Thêm thành viên mới**:
   - **Method & Path**: `POST /account/families/{familyId}/members`
   - **Payload**:
     ```json
     {
       "userId": 12,
       "role": "CAREGIVER",
       "relation": "THANH_VIEN_KHAC",
       "parentUserId": null
     }
     ```

2. **Cập nhật thành viên**:
   - **Method & Path**: `PUT /account/families/{familyId}/members/{memberUserId}`
   - **Yêu cầu quan trọng**: API `PUT` của backend yêu cầu đối tượng `UpdateFamilyMemberRequest` phải chứa đầy đủ các trường `@NotBlank` bao gồm `displayName`, `username`, `email` để cập nhật đồng bộ thông tin tài khoản:
     ```json
     {
       "displayName": "Tên hiển thị mới",
       "username": "username_hien_tai",
       "email": "email_hien_tai@gmail.com",
       "role": "MOM",
       "relation": "ME",
       "parentUserId": null
     }
     ```
   - **Giải pháp Frontend**: Trước khi mở chế độ chỉnh sửa hoặc gửi request cập nhật, frontend sẽ gọi API `GET /account/users/{userId}` để nạp chi tiết tài khoản của người dùng (lấy `username` và `email`), đảm bảo payload hợp lệ 100%.

3. **Xóa thành viên khỏi gia đình**:
   - **Method & Path**: `DELETE /account/families/{familyId}/members/{memberUserId}`

---

## 3. Cấu trúc Giao diện Frontend Premium (Angular & Ng-Zorro)

### 3.1 Giao diện Modal Quản lý thành viên
- **Thanh tìm kiếm tài khoản thông minh**: Admin nhập Username hoặc Email -> Hệ thống gọi API `/account/users/lookup?username=...` hoặc `?email=...` -> Trả về tài khoản người dùng -> Hiển thị thẻ thông tin dạng Glassmorphism sang trọng.
- **Chọn thông tin phụ trợ**: Dropdown chọn Vai trò (`rolesList`), Quan hệ (`relationsList`), và Cha/Mẹ (chỉ chọn từ các thành viên hiện có của gia đình đó).
- **Inline Editing Table**:
  - Hiển thị danh sách thành viên dạng bảng hiện đại.
  - Khi Admin bấm "Chỉnh sửa", dòng tương ứng sẽ chuyển sang dạng Form chỉnh sửa trực tiếp (Inline Edit) với các input và select nhỏ gọn, mượt mà.
  - Cung cấp các nút Xác nhận ("Lưu") và "Hủy" trực tiếp trên dòng.
- **Xóa thành viên an toàn**: Nút "Xóa" tích hợp Component `nz-popconfirm` yêu cầu xác nhận trước khi thực hiện để tránh bấm nhầm.

### 3.2 Khai báo Ng-Zorro UI Modules bổ sung
Trong component Standalone `AdminFamiliesComponent`, chúng ta đã import các module sau để xây dựng giao diện:
- `NzSelectModule` (Chọn vai trò, quan hệ, cha mẹ)
- `NzTableModule` (Bảng hiển thị danh sách thành viên mượt mà)
- `NzDividerModule` (Đường kẻ phân tách các phần)
- `NzTagModule` (Badge hiển thị trạng thái và vai trò)
- `NzSpinModule` (Loader tải thông tin thành viên mượt mà)

---

## 4. Hệ thống Bản dịch Đa ngôn ngữ (i18n)

Để ứng dụng đạt chuẩn Premium, tất cả các nhãn (labels), tiêu đề, nút bấm và thông báo phản hồi (messages) đều được dịch thuật đầy đủ và đặt trong:
- **Tiếng Việt**: [vi.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/vi.json) dưới khóa `momApp.admin.families`
- **Tiếng Anh**: [en.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/en.json) dưới khóa `momApp.admin.families`

---
*Tài liệu được biên soạn bởi Antigravity AI Code Assistant, tháng 5/2026.*
