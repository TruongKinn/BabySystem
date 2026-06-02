# Kế hoạch phân chia Sidebar Menu Admin

Để cải thiện trải nghiệm người dùng vận hành hệ thống (Admin), thay vì gom tất cả 9 mục menu quản trị vào một nhóm duy nhất mang tên "Quản trị hệ thống" (Portal), chúng tôi đề xuất phân chia sidebar menu của Admin thành 4 nhóm chức năng rõ rệt, khoa học và trực quan, tương tự như giao diện của User Portal.

---

## Đề xuất cấu trúc nhóm menu mới

Chúng tôi sẽ phân tách 9 mục menu hiện tại thành các nhóm sau:

1. **Giám sát & Tài khoản (System & Accounts)**
   - Dashboard Admin (Tổng quan hệ thống)
   - Quản lý người dùng (Tài khoản người dùng)
   - Quản lý hộ gia đình (Thông tin các hộ gia đình)

2. **Kinh doanh & Tài chính (Business & Finance)**
   - Cấu hình Premium (Entitlements & Quest Points)
   - Quản lý tài chính (Giám sát ngân sách, chi tiêu gia đình)

3. **Bảo mật & Phân quyền (Security & Access)**
   - Kiểm soát truy cập (Access Control - Role mapping)
   - Danh mục quyền (Permissions Catalog - MENU & API)
   - Quản lý password export (File XLSX export an toàn)

4. **Cấu hình hệ thống (System Settings)**
   - Cài đặt giao diện (Theme Settings)

---

## Thay đổi mã nguồn đề xuất

### 1. [frontend-service](file:///d:/AI-AGENT/BabySystem/codebase/frontend)

#### [MODIFY] [app.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/app.ts)
- Thay đổi cấu trúc của mảng `adminMenuItems` để chia thành 4 phần tử cha tương ứng với 4 nhóm menu mới.
- Cập nhật các icon phù hợp cho từng menu con.

#### [MODIFY] [sidebar.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/shared/sidebar/sidebar.component.html)
- Bổ sung switch-case `'settings'` vào thuộc tính `group.icon` để hiển thị biểu tượng bánh răng cho nhóm "Cấu hình hệ thống".

#### [NEW] Thư mục dịch thuật menu con `public/i18n/momApp/admin/menu/`
Tạo đầy đủ 4 file dịch cho 4 ngôn ngữ con để định nghĩa nhãn dịch cho 4 nhóm cha:
- [NEW] [vi.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/momApp/admin/menu/vi.json)
- [NEW] [en.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/momApp/admin/menu/en.json)
- [NEW] [zh.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/momApp/admin/menu/zh.json)
- [NEW] [ja.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/momApp/admin/menu/ja.json)

---

## Quy trình Kiểm thử & Xác minh

### Tự động đồng bộ dịch thuật
- Chạy lệnh compile i18n để deep-merge các key mới vào file dịch gốc:
  ```bash
  node codebase/scripts/compile-i18n.js
  ```

### Xác minh thủ công
- Đăng nhập tài khoản Admin hoặc Owner.
- Mở sidebar menu và kiểm tra xem menu Admin đã được phân chia thành 4 nhóm trực quan hay chưa.
- Kiểm tra các biểu tượng icon của nhóm cha và nhóm con hiển thị đúng chuẩn.
- Đổi ngôn ngữ qua lại (Tiếng Việt, Tiếng Anh, Tiếng Nhật, Tiếng Trung) để xác nhận các nhãn menu cha hiển thị chính xác.
