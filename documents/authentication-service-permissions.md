# Quản Lý Quyền Truy Cập (Authentication Service Permissions)

Tài liệu này ghi nhận các quyền truy cập (API & Menu Permissions) mới được bổ sung vào hệ thống để khắc phục lỗi trang quản lý permissions và đăng ký đầy đủ các endpoint còn thiếu từ gateway docs.

## 1. Quyền Truy Cập Mới (Flyway Migration V45)

Các quyền truy cập mới được khai báo trong file migration `V45__admin_permissions_page_permissions.sql`:

### Quyền Menu (Menu Permission)
*   `MENU:ADMIN_PERMISSIONS` (Menu Key: `/admin/permissions`): Cho phép hiển thị và truy cập trang quản lý permissions cho Admin.

### Quyền API (API Permissions)
Bao gồm tất cả các API endpoint được định nghĩa trong codebase backend nhưng chưa được đăng ký trong DB, nổi bật như:
*   `API:GET:AUTH_ROLES_PERMISSIONS`: `GET /auth/roles/permissions` (API lấy danh sách permissions có phân trang).
*   `API:GET:AUTH_ROLES_PERMISSIONS_MISSING_APIS`: `GET /auth/roles/permissions/missing-apis` (API lấy danh sách các endpoint chưa đăng ký permission).
*   Và hơn 50 API REST khác thuộc các service `account-service`, `authentication-service`, `baby-service`, `expense-service`, `file-service`, `insight-service`, `meal-service`.

## 2. Gán Quyền Cho Vai Trò (Role Assignment)
Tất cả các quyền mới trên đã được tự động gán cho các vai trò quản trị tối cao của hệ thống:
*   `ADMIN`
*   `OWNER`

## 3. Bản Dịch Đa Ngôn Ngữ (i18n)
Theo thiết kế chia nhỏ, các bản dịch đa ngôn ngữ cho màn hình này được định nghĩa tại thư mục `codebase/frontend/public/i18n/admin/permissions/` gồm 4 file ngôn ngữ đồng bộ:
*   `vi.json` (Tiếng Việt)
*   `en.json` (Tiếng Anh)
*   `zh.json` (Tiếng Trung)
*   `ja.json` (Tiếng Nhật)

Sau khi chỉnh sửa, hệ thống đã biên dịch đồng bộ vào các file i18n cha thông qua lệnh:
```bash
node codebase/scripts/compile-i18n.js
```
