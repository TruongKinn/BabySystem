# Dịch vụ Thiết kế Giao diện (Theme Service) - Đồng bộ & Nâng cấp Giao diện Portal Admin

Tài liệu này ghi nhận kiến trúc, thiết kế và các giải pháp kỹ thuật nhằm đồng bộ hóa 100% giao diện các trang trong **Portal Admin** theo cấu hình của **Theme Studio** (màu sắc Accent, độ bo góc Radius) và nâng cấp giao diện đạt chuẩn **Premium First** sang trọng.

---

## 1. Kiến trúc Đồng bộ hóa CSS (Real-time Integration)

Hệ thống Theme Studio của BabySystem hoạt động dựa trên các lớp class toàn cục được gán động vào thẻ `<body>` bởi `UserPreferencesService` mỗi khi người dùng thay đổi thiết lập:
* **Màu sắc Accent (`theme-accent-*`):** Thiết lập lại giá trị cho biến `--primary-color` và các gradient `--user-grad-1`, `--user-grad-2`.
* **Độ bo góc (`theme-radius-*`):** Thiết lập lại giá trị cho biến `--user-card-radius` (dành cho Card, Hero card) và `--user-btn-radius` (dành cho nút bấm, input, tag, check, selector).

Để Portal Admin tự động ăn khớp theo thiết lập này mà không cần tải lại trang hay viết các selector ghi đè phức tạp, toàn bộ các tệp tin CSS của các Admin Component đã được nâng cấp để sử dụng trực tiếp các biến CSS này thay thế cho các giá trị hardcode trước đó.

---

## 2. Tiêu chuẩn Thiết kế Nâng cấp (Premium Design System)

Để biến các trang quản trị tẻ nhạt thành các trang giao diện Premium hiện đại, chúng tôi áp dụng 3 tiêu chuẩn thiết kế chủ đạo:

### 2.1. Nền Hero Card hắt sáng động (Dynamic Glow Gradient)
Thay thế cho nền Slate-Teal tĩnh cố định, phần tiêu đề Hero của mỗi trang được trang bị công thức nền phối hợp hắt sáng động:
```css
background:
  radial-gradient(circle at 90% 10%, color-mix(in srgb, var(--primary-color, #0f766e) 30%, transparent), transparent 50%),
  linear-gradient(140deg, #0f172a 0%, #112235 60%, color-mix(in srgb, var(--primary-color, #0f766e) 35%, #0f172a) 100%);
```
* **Ý nghĩa:** Nền tối sâu thẳm sang trọng vẫn được giữ vững để duy trì tính dễ đọc cho văn bản màu sáng, nhưng phần hắt sáng ở góc trên bên phải và góc dưới bên trái sẽ tự động pha trộn và đổi màu theo đúng Accent được chọn ở Settings.

### 2.2. Hộp Thống kê Kính mờ (Glassmorphism Stat Tiles)
Nâng cấp các ô hiển thị chỉ số thống kê (`.hero-stat`) trong hero card:
* Nền kính mờ trong suốt nhẹ: `background: rgba(255, 255, 255, 0.03);`
* Bộ lọc mờ: `backdrop-filter: blur(8px);`
* Đường viền mỏng pha màu tinh tế: `border: 1px solid color-mix(in srgb, var(--primary-color) 25%, rgba(255, 255, 255, 0.1));`
* **Hiệu ứng tương tác:** Khi hover, ô thống kê sẽ tự động nhô cao nhẹ (`transform: translateY(-2px)`), tăng độ sáng nền và đổ bóng mềm mại để tạo độ sâu 3D sang trọng.

### 2.3. Bo góc Nhất quán (Consistent Radius Flow)
* **Card lớn và Hero:** Kế thừa biến `--user-card-radius` (thay đổi từ `10px` cho Sharp, `18px/20px` cho Soft, `24px` cho Rounded, và `30px` cho Pill).
* **Nút bấm, Input, Tag và Selector:** Kế thừa biến `--user-btn-radius` (thay đổi linh hoạt từ `8px` cho Sharp đến `999px` cho Pill).

---

## 3. Danh sách các Component được nâng cấp

Dưới đây là chi tiết các tệp tin CSS cục bộ trong Portal Admin được chỉnh sửa và đồng bộ hóa:

1. **Quản lý Người dùng (Users):** `codebase/frontend/src/app/admin/users/admin-users.component.css`
2. **Quyền truy cập (Access & Roles):** `codebase/frontend/src/app/admin/access/admin-access.component.css`
3. **Quản lý Quyền hạn (Permissions):** `codebase/frontend/src/app/admin/permissions/admin-permissions.component.css`
4. **Export Mật khẩu (Export Passwords):** `codebase/frontend/src/app/admin/export-passwords/admin-export-passwords.component.css`
5. **Quản lý Gia đình (Families):** `codebase/frontend/src/app/admin/families/admin-families.component.css`
6. **Quản lý Tài chính (Finance):** `codebase/frontend/src/app/admin/finance/admin-finance.component.css`
7. **Quản lý Premium (Premium Packages):** `codebase/frontend/src/app/admin/premium/admin-premium.component.css`
8. **Bảng điều khiển (Dashboard):** `codebase/frontend/src/app/admin/dashboard/admin-dashboard.component.css`

---

## 4. Trải nghiệm Người dùng Đạt được

* **Mượt mà & Nhất quán:** Toàn bộ hệ thống có một nhịp điệu hình khối đồng đều. Khi chuyển Radius từ `soft` sang `pill`, các card và các nút chuyển từ dạng bo góc mềm mại sang bo góc tròn trịa cực kỳ đồng điệu.
* **Màu sắc Hài hòa:** Tránh việc trang admin chỉ có duy nhất một màu Teal nhàm chán. Admin giờ đây có thể cá nhân hóa toàn bộ bảng làm việc của mình sang tông màu Xanh dương tập trung, Hồng ngọt ngào, Tím sáng tạo hay Emerald mát mẻ.
* **Chiều sâu Thị giác (Visual Depth):** Việc sử dụng bóng đổ tinh tế, backdrop-filter kính mờ và các hiệu ứng di chuyển vi mô làm cho giao diện như đang "sống", phản hồi ngay lập tức với hành vi của người dùng.
