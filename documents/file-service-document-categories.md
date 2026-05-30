# Tài liệu Kỹ thuật: Hệ thống Phân loại Tài liệu Động (Document Category Master Data)

Tài liệu này mô tả chi tiết thiết kế hệ thống và cấu trúc dữ liệu cho tính năng Quản lý phân loại tài liệu (Master Data) của `file-service`.

## 1. Thiết kế Cơ sở dữ liệu (PostgreSQL)

Bảng `document_category` được sử dụng để lưu trữ danh sách các phân loại tài liệu của hệ thống (dùng chung cho tất cả các gia đình, có `family_id` là `NULL`) và các phân loại riêng do từng gia đình tự tạo (`family_id` có giá trị cụ thể).

### Cấu trúc bảng `document_category`

| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `BIGSERIAL` | `PRIMARY KEY` | Định danh tự tăng của danh mục |
| `family_id` | `BIGINT` | `NULLABLE` | ID của gia đình sở hữu. `NULL` nghĩa là danh mục hệ thống dùng chung |
| `name` | `VARCHAR(255)` | `NOT NULL` | Tên của phân loại (ví dụ: Giấy khai sinh, Hóa đơn...) |
| `icon` | `VARCHAR(100)` | `NULLABLE` | Tên icon đại diện (ví dụ: `file-text`, `safety-certificate`) |
| `color` | `VARCHAR(100)` | `NULLABLE` | Mã màu HEX hoặc CSS variables của phân loại (ví dụ: `#3b82f6`) |
| `created_at`| `TIMESTAMP` | `DEFAULT NOW()`| Thời điểm tạo danh mục |

### SQL DDL & Cài đặt dữ liệu mẫu
```sql
CREATE TABLE document_category (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    color VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tạo chỉ mục tối ưu truy vấn theo gia đình
CREATE INDEX idx_doc_cat_family_id ON document_category(family_id);

-- Chèn dữ liệu Master Data mặc định của hệ thống
INSERT INTO document_category (family_id, name, icon, color) VALUES
(NULL, 'Giấy khai sinh', 'file-text', '#3b82f6'),
(NULL, 'Sổ tiêm chủng', 'safety-certificate', '#10b981'),
(NULL, 'Sổ khám bệnh', 'heart', '#ef4444'),
(NULL, 'Thẻ bảo hiểm', 'property-safety', '#8b5cf6');
```

---

## 2. API Endpoints (`file-service`)

Tất cả các API được định tuyến thông qua Gateway với tiền tố `/file`.

### 2.1. Lấy danh sách phân loại tài liệu
* **Endpoint**: `GET /api/document-categories`
* **Tham số truy vấn (Query Params)**:
  * `familyId` (Long, bắt buộc): ID của gia đình hiện tại.
* **Quyền hạn (Permission)**: `API:GET:DOCUMENT_CATEGORY_LIST`
* **Mô tả**: Trả về toàn bộ danh mục hệ thống mặc định (`family_id IS NULL`) kết hợp với danh mục riêng của gia đình đó.
* **Mẫu kết quả phản hồi (Response)**:
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "familyId": null,
      "name": "Giấy khai sinh",
      "icon": "file-text",
      "color": "#3b82f6",
      "createdAt": "2026-05-30T07:12:00"
    },
    {
      "id": 5,
      "familyId": 1,
      "name": "Hồ sơ tiêm chủng đặc biệt",
      "icon": "safety-certificate",
      "color": "#10b981",
      "createdAt": "2026-05-30T07:15:30"
    }
  ]
}
```

### 2.2. Tạo mới một phân loại tài liệu
* **Endpoint**: `POST /api/document-categories`
* **Quyền hạn (Permission)**: `API:POST:DOCUMENT_CATEGORY_CREATE`
* **Thân yêu cầu (Request Body)**:
```json
{
  "familyId": 1,
  "name": "Hồ sơ bảo hiểm sức khỏe",
  "icon": "property-safety",
  "color": "#8b5cf6"
}
```
* **Mô tả**: Tạo một danh mục phân loại mới thuộc gia đình. Hệ thống tự động kiểm tra trùng tên không phân biệt hoa thường (tránh trùng lặp với danh mục hệ thống hoặc danh mục khác cùng gia đình).

---

## 3. Tích hợp phân quyền API (`authentication-service`)

Tích hợp quyền truy cập API vào hệ thống quản lý phân quyền tập trung bằng Flyway Migration SQL của `authentication-service`:
```sql
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:DOCUMENT_CATEGORY_LIST', 'Get document categories list', 'API', 'GET', '/file/document-categories'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:DOCUMENT_CATEGORY_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:DOCUMENT_CATEGORY_CREATE', 'Create document category', 'API', 'POST', '/file/document-categories'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:DOCUMENT_CATEGORY_CREATE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:DOCUMENT_CATEGORY_LIST',
    'API:POST:DOCUMENT_CATEGORY_CREATE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
```
