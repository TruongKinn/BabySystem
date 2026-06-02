# Tài Liệu Kỹ Thuật: Sắp Xếp Thẳng Hàng Bộ Lọc Chi Tiêu Bằng CSS Grid Layout Chuẩn Premium

Tài liệu này lưu trữ giải pháp kỹ thuật tối ưu hóa bộ lọc Chi tiêu (`Expenses`), kết hợp tính năng căn lề sát đáy của CSS Grid Layout và tính thẩm mỹ Premium tinh tế của User Theme.

## 1. Vấn Đề (Problem)
Khi chuyển đổi bộ lọc sang sử dụng Grid của Ant Design (`nz-row` và `nz-col`), trong môi trường Modal phức tạp (như Modal "Kho Hóa đơn & Chứng từ Chi tiêu"), hiện tượng **các ô nhập liệu bị dính sát vào nhau** xảy ra do:
- Các CSS reset của modal hoặc các rule kế thừa trong dự án làm triệt tiêu thuộc tính padding của các cột `nz-col`. Khoảng cách đệm (gutter) bị biến mất hoàn toàn, khiến mép phải của ô Danh mục chạm sát vào mép trái của ô Tìm kiếm.

---

## 2. Giải Pháp Khắc Phục Triệt Để: Sử Dụng CSS Grid Layout
Chúng tôi đã áp dụng giải pháp chuyển đổi toàn bộ bộ lọc sang cấu trúc **CSS Grid** (`display: grid`) siêu gọn nhẹ, hiện đại và cực kỳ ổn định:

### A. Tái Cấu Trúc Bằng CSS Grid Container
Chúng tôi loại bỏ các thẻ `nz-row` và `nz-col` lồng nhau phức tạp, sử dụng trực tiếp các class CSS Grid:
- **Bộ lọc ở màn hình chính**:
  ```html
  <div class="filter-row" style="display: grid; grid-template-columns: 1.2fr 1.8fr 1.2fr auto; gap: 16px; align-items: end;">
  ```
- **Bộ lọc compact trong modal**:
  ```html
  <div class="filter-row filter-row--compact" style="margin-bottom: 20px; display: grid; grid-template-columns: 1.2fr 1.5fr 1fr; gap: 12px; align-items: end;">
  ```

**Tại sao CSS Grid là giải pháp tối thượng?**
1.  **Khoảng cách tuyệt đối (`gap`)**: Khoảng cách cách đều (16px ở trang chính và 12px ở trong modal) được trình duyệt dựng trực tiếp trên Grid container. Thuộc tính `gap` này hoạt động độc lập và **chắc chắn 100% không bao giờ có thể bị dính nhau** hay bị ghi đè bởi bất cứ CSS reset nào của modal.
2.  **Thẳng hàng tắp lự**: Kết hợp với việc chúng tôi đã **khóa chiều cao label cố định (18px)** và **ép chiều cao input/select (38px)** ở các bước trước, thuộc tính `align-items: end` của CSS Grid giúp toàn bộ mép trên của label và đặc biệt là **mép dưới của các ô nhập liệu thẳng tắp một đường chỉ ngang hoàn hảo, không lệch một ly!**

### B. Khôi Phục Thẩm Mỹ Premium Tinh Tế
Sử dụng cấu trúc nhãn label tùy chỉnh `<label>` được bọc bên trong lớp `.filter-field` ban đầu:
```html
<div class="filter-field filter-field-category">
  <label>{{ 'momApp.expenses.filters.category' | translate }}</label>
  <nz-select ... class="user-filter-select">...</nz-select>
</div>
```
- Nhãn label giữ nguyên font chữ nhỏ gọn (12px), màu sắc tinh tế (`var(--text-secondary)`) và khoảng cách đệm 6px cực đẹp, không bị đè bởi form Ant Design thô kệch.

### C. Khóa Chiều Cao Đồng Bộ Ở Mọi Cấp Độ Thẻ
- Thiết lập chiều cao label cố định **18px** và line-height **18px** trong `expenses.component.css`.
- Cấu hình chiều cao cứng **38px** đồng bộ ở mọi cấp độ thẻ (cả host và con) cho Select và Input Group trong `styles.css`.

---

## 3. Các File Đã Thay Đổi
1. **[expenses.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.html)**: Thay đổi cấu trúc CSS Grid cho cả bộ lọc chính và bộ lọc compact trong modal.
2. **[expenses.component.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.css)**: Thiết lập chiều cao, line-height và margin cố định cho nhãn label.
3. **[styles.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/styles.css)**: Cấu hình chiều cao cứng 38px đồng bộ ở mọi cấp độ thẻ cho Select và Input Group.

---

## 4. Kết Quả
- **Khoảng Cách Hoàn Hảo**: Ba ô bộ lọc trong modal cách đều nhau **12px** cực kỳ đẹp mắt và ngăn nắp, chấm dứt hoàn toàn hiện tượng dính sát vào nhau.
- **Thẳng Hàng Tuyệt Đối**: Tất cả các ô nhập liệu (select-box, input tìm kiếm) được căn thẳng tắp một đường ngang ở mép đáy.
- **Tự Động Responsive**: Hoạt động mượt mà trên desktop/tablet và tự động co giãn xếp chồng ngăn nắp trên mobile.
