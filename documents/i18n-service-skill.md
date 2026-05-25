# Tài liệu Hướng dẫn: Hệ thống Tự động hóa i18n theo Route Màn hình

Tài liệu này đặc tả kiến trúc quản lý dịch thuật đa ngôn ngữ (i18n) chia nhỏ theo route màn hình và hướng dẫn sử dụng công cụ gộp dịch thuật (`compile-i18n.js`) cùng AI Skill (`i18n-generator`) trong dự án **BabySystem**.

---

## 1. Tổng quan & Lý do Thiết kế

Trong các dự án Angular lớn, việc gom tất cả các chuỗi dịch thuật của toàn bộ ứng dụng vào hai file khổng lồ `vi.json` và `en.json` mang lại nhiều hạn chế:
- **Xung đột Git (Merge Conflicts):** Nhiều lập trình viên cùng chỉnh sửa một file JSON dẫn tới xung đột liên tục khi merge code.
- **Khó bảo trì:** Rất khó tìm kiếm, cập nhật hoặc xóa bỏ các key dịch thuật đã lỗi thời của một màn hình cụ thể.
- **Hiệu năng:** File JSON quá lớn làm tăng dung lượng tải trang ban đầu.

**Giải pháp thiết kế:**
Chúng ta chia nhỏ các file dịch thuật theo cấu trúc thư mục tương ứng với **URL route** của màn hình.
- Ví dụ: Màn hình Cài đặt tại `http://localhost:4200/app/settings` sẽ có các file dịch con:
  - `public/i18n/app/settings/vi.json`
  - `public/i18n/app/settings/en.json`

Một script Node.js thông minh (`compile-i18n.js`) sẽ tự động quét, phân cấp cấu trúc và **deep-merge** (gộp sâu) các file dịch con này vào file cha gốc (`public/i18n/vi.json` và `en.json`) trước khi build hoặc chạy ứng dụng.

---

## 2. Quy trình Phát triển i18n mới

Khi bạn muốn thêm i18n cho một màn hình (ví dụ: màn hình Quản lý tài chính tại route `/app/expenses`):

### Bước 1: Tạo các file dịch con
Tạo thư mục `public/i18n/app/expenses/` và tạo 2 file:

`public/i18n/app/expenses/vi.json` (Bản dịch tiếng Việt):
```json
{
  "title": "Quản lý chi tiêu gia đình",
  "addExpenseBtn": "Thêm khoản chi",
  "category": {
    "food": "Ăn uống",
    "shopping": "Mua sắm"
  }
}
```

`public/i18n/app/expenses/en.json` (Bản dịch tiếng Anh):
```json
{
  "title": "Family Expense Management",
  "addExpenseBtn": "Add Expense",
  "category": {
    "food": "Food & Beverage",
    "shopping": "Shopping"
  }
}
```

### Bước 2: Sử dụng các key dịch thuật trong component
Khi gộp vào file cha, các key trên sẽ tự động được lồng dưới key đại diện cho route path: `app.expenses`.
Do đó, trong mã nguồn Angular của component `ExpensesComponent`:

**Trong file HTML (`expenses.component.html`):**
```html
<h2>{{ 'app.expenses.title' | translate }}</h2>
<button nz-button nzType="primary">
  {{ 'app.expenses.addExpenseBtn' | translate }}
</button>
```

**Trong file TS (`expenses.component.ts`):**
```typescript
import { I18nService } from '../i18n/i18n.service';

constructor(private i18nService: I18nService) {}

showSuccess() {
  const msg = this.i18nService.translate('app.expenses.category.food');
  // ...
}
```

### Bước 3: Chạy script gộp (Compile) i18n
Sau khi hoàn thành tạo file JSON con, chạy lệnh sau tại thư mục gốc của dự án:
```bash
node codebase/scripts/compile-i18n.js
```

Script sẽ thực hiện:
1. Quét đệ quy tìm tất cả các file JSON con.
2. Tạo file sao lưu `.bak` cho các file cha gốc để đảm bảo an toàn.
3. Gộp các file con vào file cha theo đúng sơ đồ route lồng nhau.
4. Định dạng lại file cha gốc sạch sẽ.

---

## 3. Cú pháp và Quy tắc Đặt tên

- **Tên file JSON con:** Bắt buộc phải là mã ngôn ngữ được hỗ trợ viết thường (ví dụ: `vi.json`, `en.json`).
- **Cấu trúc thư mục con:** Phải khớp chính xác với URL route của màn hình (bỏ qua domain).
  - URL: `http://localhost:4200/admin/users` ➡️ Thư mục: `public/i18n/admin/users/`
  - URL: `http://localhost:4200/app/baby` ➡️ Thư mục: `public/i18n/app/baby/`
- **Key dịch thuật dùng chung:** Các key mang tính chất toàn cục hoặc dùng chung nhiều nơi (như nút "Lưu", "Hủy", "Quay lại") nên được sử dụng trực tiếp từ key cha `commonActions` hoặc `common` thay vì định nghĩa lại ở file con.

---

## 4. Tích hợp AI Agent (i18n-generator Skill)

Khi làm việc với AI Agent Antigravity, bạn chỉ cần ra lệnh:
> *"Hãy thêm i18n cho màn hình http://localhost:4200/app/settings"*

AI Agent sẽ tự động kích hoạt kỹ năng `i18n-generator` để:
1. Đọc và phân tích toàn bộ code HTML/TS của màn hình đó.
2. Trích xuất tất cả text cứng.
3. Đề xuất bản dịch Anh-Việt chuẩn xác.
4. Tự động tạo các file dịch con ở đúng thư mục `public/i18n/app/settings/`.
5. Tự động thay thế text cứng trong code của bạn thành các thẻ dịch thuật.
6. Tự động chạy lệnh gộp i18n để ứng dụng chạy được ngay lập tức.
