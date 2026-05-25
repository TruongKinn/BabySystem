# Tài liệu Hướng dẫn: Khắc phục và Phục vụ Tệp Excel mẫu tĩnh trong Frontend

Tài liệu này mô tả chi tiết lỗi tải tệp mẫu Excel chi tiêu và cách khắc phục bằng cách sử dụng thư mục tĩnh của Angular 17+ trong `frontend-service`.

---

## 1. Mô tả Lỗi
Khi người dùng truy cập giao diện Quản lý Tài liệu (`/app/documents`) và nhấn nút **"Tải Excel mẫu"** ở banner trên cùng hoặc trong giao diện nhập liệu, trình duyệt báo lỗi **404 Not Found**.

### Nguyên nhân:
- Liên kết tải về trỏ đến `/assets/templates/expense_import_template.xlsx`.
- Trong Angular 17+ (sử dụng cấu trúc dự án mới của Angular CLI), thư mục tài nguyên tĩnh mặc định là `/public/` nằm ở thư mục gốc của frontend, chứ không phải nằm trong `/src/assets/` như các phiên bản cũ.
- Tệp `expense_import_template.xlsx` thực tế chưa được sinh ra và đưa vào thư mục tĩnh này.

---

## 2. Giải pháp Khắc phục

### Bước 1: Sinh tệp Excel nhị phân thực tế
Chúng ta sử dụng thư viện `xlsx` (SheetJS) đã được khai báo sẵn trong `dependencies` của `package.json` để tạo tệp Excel có cấu trúc cột khớp hoàn hảo với Parser của backend (`expense-service` / `file-service`).

**Dữ liệu mẫu:**
- **Ngày chi tiêu** (định dạng `YYYY-MM-DD`)
- **Danh mục** (các danh mục có sẵn như `Meals`, `Shopping`, `Education`, `Medical`, `Others`)
- **Số tiền** (định dạng số nguyên)
- **Ghi chú** (văn bản ngắn gọn)

**Script Node.js sinh tệp (`generate_excel.js`):**
Tệp mẫu sẽ được tự động ghi vào đường dẫn tĩnh của Angular:
`codebase/frontend/public/templates/expense_import_template.xlsx`.

### Bước 2: Cập nhật Angular HTML
Cập nhật thuộc tính `href` trong tệp [documents.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/documents/documents.component.html):
```html
<!-- Trước khi sửa -->
<a href="/assets/templates/expense_import_template.xlsx" download ...>Tải Excel mẫu</a>

<!-- Sau khi sửa -->
<a href="/templates/expense_import_template.xlsx" download ...>Tải Excel mẫu</a>
```

### Bước 3: Phục vụ tệp tĩnh (Static Assets Service)
Khi chạy dev server (`npm run dev` hoặc `ng serve`), Angular tự động ánh xạ mọi tài nguyên trong thư mục `codebase/frontend/public/` ra URL gốc. 
Do đó, tệp nằm tại `public/templates/expense_import_template.xlsx` sẽ được truy cập trực tiếp qua đường dẫn tĩnh `/templates/expense_import_template.xlsx`.

---

## 3. Quy trình Kiểm thử & Xác minh
1. Xác minh tệp Excel được sinh ra thành công trên đĩa.
2. Click tải tệp trên trình duyệt để kiểm tra phản hồi HTTP 200 OK.
3. Mở tệp bằng Excel/Google Sheets để đảm bảo không bị lỗi định dạng file nhị phân.
4. Tải lên tệp Excel mẫu vừa tải về ở Tab **"Nhập chi tiêu từ Excel"** để xác minh quá trình Parse dữ liệu Preview hoạt động mượt mà.
