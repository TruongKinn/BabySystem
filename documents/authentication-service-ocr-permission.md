# Bổ sung Quyền API OCR Receipt cho AI Service

> **Dịch vụ liên quan:** `authentication-service`, `ai-service`, `api-gateway`  
> **Cập nhật lần cuối:** 2026-06-01  
> **Trạng thái:** Đã hoàn thành thực thi

---

## 1. Lý do thay đổi

Khi người dùng thực hiện yêu cầu phân tích hóa đơn chi tiêu thông qua API `POST /ai/copilot/ocr-receipt` (đường dẫn đi qua API Gateway cổng `4953`), hệ thống trả về mã lỗi **403 Forbidden**. 

**Nguyên nhân:** 
API Gateway kiểm tra quyền truy cập của người dùng đối với route `/ai/copilot/ocr-receipt`. Do endpoint này chưa được đăng ký trong danh sách các quyền hạn hợp lệ (`tbl_permission`) của hệ thống và chưa được gán cho các nhóm quyền (Roles) của người dùng hiện tại, Gateway đã chặn request này.

---

## 2. Giải pháp thực hiện

Chúng tôi đã triển khai giải pháp cấu hình di chuyển cơ sở dữ liệu (Flyway Migration) để tự động hóa việc đăng ký quyền này cho tất cả các môi trường.

### Tệp tin Migration SQL
- **Đường dẫn:** `codebase/backend/authentication-service/src/main/resources/db/migration/V46__add_ocr_receipt_api_permission.sql`
- **Nội dung thực thi:**

```sql
-- AI Copilot OCR Receipt API permission
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AI_COPILOT_OCR_RECEIPT', 'Extract data from family receipts using AI OCR', 'API', 'POST', '/ai/copilot/ocr-receipt'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AI_COPILOT_OCR_RECEIPT');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name = 'API:POST:AI_COPILOT_OCR_RECEIPT'
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
```

### Các bước áp dụng:
1. Tạo tệp tin Flyway di trú `V46__add_ocr_receipt_api_permission.sql` trên.
2. Dừng tiến trình Java của `authentication-service` đang chạy trên cổng `8081`.
3. Khởi động lại dịch vụ `authentication-service` thông qua Maven Wrapper (`.\mvnw.cmd spring-boot:run`).
4. Flyway tự động phát hiện phiên bản CSDL hiện tại đang ở `v45` và thực thi thành công tệp `V46` để nâng cấp lên phiên bản `v46`.

---

## 3. Kết quả xác minh

Dựa trên nhật ký khởi động (Logs) của dịch vụ `authentication-service`:
- Flyway đã áp dụng thành công script di trú:
  ```text
  o.f.core.internal.command.DbMigrate      : Successfully applied 1 migration to schema "public", now at version v46 (execution time 00:00.028s)
  ```
- Dịch vụ đã khởi động lại hoàn toàn trên cổng `8081` và nạp lại chính sách phân quyền thành công.
- Mã lỗi **403 Forbidden** đối với API `/ai/copilot/ocr-receipt` đã được khắc phục hoàn toàn.
