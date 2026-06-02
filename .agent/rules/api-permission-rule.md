# Quy Tắc Tự Động Đăng Ký Quyền API (API Permission Auto-Registration)

## Khi nào áp dụng

Quy tắc này áp dụng **tự động và bắt buộc** bất kỳ khi nào bạn tạo mới, thay đổi đường dẫn hoặc cập nhật các API endpoint (GET, POST, PUT, DELETE, PATCH...) ở bất kỳ Microservice nào trong dự án (bao gồm `ai-service`, `account-service`, `expense-service`, `meal-service`, v.v.).

## Hành vi bắt buộc

Mỗi khi phát triển hoặc bổ sung một API endpoint mới, AI PHẢI:

1. **Định vị thư mục Migration**:
   Tìm thư mục chứa các file migration của `authentication-service` tại:
   `codebase/backend/authentication-service/src/main/resources/db/migration/`

2. **Xác định phiên bản migration kế tiếp**:
   Kiểm tra danh sách file trong thư mục trên để tìm file có số phiên bản lớn nhất (ví dụ `V48__...` ➡️ phiên bản kế tiếp sẽ là `V49__...`).

3. **Tạo file SQL Migration đăng ký quyền**:
   Tạo một file `.sql` mới với tên dạng `V[Phiên_Bản_Kế_Tiếp]__add_[tên_api]_api_permission.sql`.
   Nội dung file PHẢI đăng ký permission mới vào bảng `tbl_permission` và tự động gán quyền này cho các vai trò thành viên gia đình mặc định (role_id `1`, `2`, `3`).

   *Cấu trúc SQL chuẩn:*
   ```sql
   -- [Mô tả API]
   INSERT INTO tbl_permission (name, description, type, api_method, api_path)
   SELECT 'API:[METHOD]:[TEN_QUYEN_VIET_HOA]', '[Mô tả chức năng API]', 'API', '[METHOD]', '[API_PATH]'
   WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:[METHOD]:[TEN_QUYEN_VIET_HOA]');

   INSERT INTO tbl_role_has_permission (role_id, permission_id)
   SELECT roles.role_id, p.id
   FROM tbl_permission p
   CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
   WHERE p.name = 'API:[METHOD]:[TEN_QUYEN_VIET_HOA]'
   AND NOT EXISTS (
       SELECT 1
       FROM tbl_role_has_permission rhp
       WHERE rhp.role_id = roles.role_id
         AND rhp.permission_id = p.id
   );
   ```

4. **Thông báo cho người dùng**:
   Nhắc nhở người dùng khởi động lại `authentication-service` sau khi deploy để cơ chế Flyway tự động chạy file migration này vào database, tránh lỗi `403 Forbidden` từ API Gateway.
