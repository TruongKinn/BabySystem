# Bổ sung Quyền API Travel Plans cho Baby Service

> **Dịch vụ liên quan:** `authentication-service`, `baby-service`, `api-gateway`  
> **Cập nhật lần cuối:** 2026-06-02  
> **Trạng thái:** Đã tạo file migration sql và đang thực hiện kiểm thử nạp dữ liệu

---

## 1. Lý do thay đổi

Khi người dùng truy cập hoặc tương tác với tính năng Kế hoạch Du lịch Gia đình (như thêm/xóa/sửa kế hoạch hoặc xem danh sách kế hoạch du lịch của gia đình), hệ thống trả về lỗi **403 Forbidden** hoặc không thể lưu thông tin.

**Nguyên nhân:** 
Các REST Endpoints mới trong `TravelPlanController` (`/api/travel-plans/**`) thuộc `baby-service` đi qua API Gateway cổng `4953` dưới dạng `/baby/travel-plans/**`. Do các endpoint này chưa được khai báo và cấp quyền trong bảng danh mục quyền hạn (`tbl_permission`) của `authentication-service`, API Gateway đã chặn và từ chối các yêu cầu này.

---

## 2. Giải pháp thực hiện

Chúng tôi đã triển khai giải pháp cấu hình di chuyển cơ sở dữ liệu (Flyway Migration) để tự động hóa việc đăng ký các quyền API này và liên kết với các nhóm quyền (Roles) của thành viên gia đình (Mẹ - 1, Bố - 2, Bà/Người chăm sóc - 3).

### Tệp tin Migration SQL
- **Đường dẫn:** [V50__add_travel_plans_permissions.sql](file:///d:/AI-AGENT/BabySystem/codebase/backend/authentication-service/src/main/resources/db/migration/V50__add_travel_plans_permissions.sql)
- **Nội dung thực thi:**

```sql
-- Travel Plans API Permissions
-- Permission: GET /baby/travel-plans/family/{familyId}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:TRAVEL_PLANS_LIST', 'Get travel plans for family', 'API', 'GET', '/baby/travel-plans/family/{familyId}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TRAVEL_PLANS_LIST'
);

-- Permission: POST /baby/travel-plans
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:TRAVEL_PLANS_CREATE', 'Create family travel plan', 'API', 'POST', '/baby/travel-plans'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:TRAVEL_PLANS_CREATE'
);

-- Permission: PUT /baby/travel-plans/{planId}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:TRAVEL_PLANS_UPDATE', 'Update family travel plan', 'API', 'PUT', '/baby/travel-plans/{planId}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:TRAVEL_PLANS_UPDATE'
);

-- Permission: DELETE /baby/travel-plans/{planId}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:TRAVEL_PLANS_DELETE', 'Delete family travel plan', 'API', 'DELETE', '/baby/travel-plans/{planId}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:TRAVEL_PLANS_DELETE'
);

-- Assign permissions to family roles (1 = MOM, 2 = DAD, 3 = GRANDMA/CAREGIVER)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:TRAVEL_PLANS_LIST',
    'API:POST:TRAVEL_PLANS_CREATE',
    'API:PUT:TRAVEL_PLANS_UPDATE',
    'API:DELETE:TRAVEL_PLANS_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
```

### Các bước áp dụng:
1. Tạo tệp tin Flyway di trú `V50__add_travel_plans_permissions.sql`.
2. Khởi động lại dịch vụ `authentication-service` để Flyway tự động phát hiện và áp dụng di trú dữ liệu CSDL.
3. API Gateway sẽ tự động cập nhật cache quyền hạn mới và cho phép các yêu cầu truy cập hợp lệ đi qua.
