---
name: i18n-generator
description: "Tự động phân tích màn hình Angular và tạo các file JSON dịch thuật (vi.json, en.json) tương ứng theo route path của URL (ví dụ http://localhost:4200/app/settings)."
risk: low
source: community
date_added: "2026-05-25"
---

# Kỹ năng Tự động hóa i18n cho Angular theo Route màn hình

## Mục đích

Giúp AI tự động hóa việc dịch thuật đa ngôn ngữ (i18n) cho bất kỳ màn hình Angular nào dựa trên URL route (ví dụ: `http://localhost:4200/app/settings`), tối ưu hóa quy trình quản lý file JSON dịch bằng phương pháp **chia nhỏ theo route** nhằm tránh xung đột code khi làm việc nhóm và giữ mã nguồn luôn sạch sẽ.

---

## Quy trình Thực thi của AI

Khi người dùng yêu cầu: *"Thêm i18n cho màn hình có link [URL]"* hoặc khi bạn phát triển một màn hình mới, hãy thực hiện theo các bước bắt buộc sau:

### 1️⃣ Trích xuất Route và Xác định Component

1. Phân tích URL do người dùng cung cấp:
   - Loại bỏ domain và origin (ví dụ: `http://localhost:4200/app/settings` ➡️ `app/settings`).
   - Route path sạch sẽ: `app/settings`.
2. Định vị component Angular tương ứng trong dự án:
   - Thường nằm tại: `codebase/frontend/src/app/[tên-thư-mục-route]`.
   - Đối với `app/settings` ➡️ `codebase/frontend/src/app/settings/` (hoặc tra cứu file `app.routes.ts` để chắc chắn component nào đang quản lý route này).

---

### 2️⃣ Phân tích văn bản thô (Hardcoded Text)

1. Đọc nội dung file HTML của component (ví dụ: `settings.component.html`).
2. Đọc nội dung file TS của component (ví dụ: `settings.component.ts`).
3. Phát hiện tất cả văn bản hiển thị thô (tiếng Việt hoặc tiếng Anh) đang hiển thị trực tiếp với người dùng:
   - Trong file HTML: các thẻ `<p>`, `<span>`, `<button>`, `placeholder="..."`, `nzTooltipTitle="..."` v.v.
   - Trong file TS: các đoạn hội thoại cảnh báo, thông báo toast, title modal (ví dụ: `message.success('Cập nhật thành công')`).

---

### 3️⃣ Đề xuất Cấu trúc khóa i18n

1. Thiết kế các khóa dịch thuật (keys) theo chuẩn `camelCase` hoặc phân cấp sâu hơn:
   - Ví dụ: `title` ➡️ Tiêu đề, `saveBtn` ➡️ Nút lưu, `usernamePlaceholder` ➡️ Nhập tên tài khoản.
2. Tổ chức cấu trúc đề xuất cho 2 ngôn ngữ (`vi` và `en`):
   - Bản dịch tiếng Việt (`vi`): Lấy trực tiếp từ text thô hiện tại trong mã nguồn.
   - Bản dịch tiếng Anh (`en`): Dịch chuẩn nghĩa chuyên ngành công nghệ / logistics từ tiếng Việt.

---

### 4️⃣ Tạo các file JSON i18n con theo Route

1. Tạo thư mục tương ứng với route path trong `codebase/frontend/public/i18n/`:
   - Ví dụ: `codebase/frontend/public/i18n/app/settings/`
2. Tạo/cập nhật hai file dịch thuật:
   - **`vi.json`**: Chứa bản dịch tiếng Việt.
   - **`en.json`**: Chứa bản dịch tiếng Anh.
   
   *Định dạng ví dụ của `public/i18n/app/settings/vi.json`:*
   ```json
   {
     "title": "Cài đặt tài khoản",
     "saveBtn": "Lưu thay đổi"
   }
   ```

---

### 5️⃣ Cập nhật mã nguồn Component

1. Thay thế văn bản cứng trong file HTML bằng pipe dịch thuật:
   - Text thuần: `Cài đặt` ➡️ `{{ 'app.settings.title' | translate }}`
   - Attributes: `placeholder="Nhập tên"` ➡️ `[placeholder]="'app.settings.namePlaceholder' | translate"`
2. Thay thế văn bản cứng trong file TS bằng service dịch thuật:
   - Sử dụng `I18nService` đã được tiêm (inject) vào component:
     `this.i18nService.translate('app.settings.successMessage')`
   - *Lưu ý:* Phải kiểm tra xem component đã import `TranslateModule` và inject `I18nService` (hoặc `TranslateService`) chưa. Nếu chưa, hãy import và inject chúng vào component.

---

### 6️⃣ Đồng bộ hóa (Compile) i18n

1. Chạy script đồng bộ bằng công cụ terminal của bạn:
   ```bash
   node codebase/scripts/compile-i18n.js
   ```
2. Kiểm tra log output của script để đảm bảo:
   - Script tìm thấy các file dịch con của bạn.
   - Các file dịch tổng `public/i18n/vi.json` và `public/i18n/en.json` được deep-merge hoàn tất thành công.
   - Các file sao lưu `.bak` được tạo đầy đủ.

---

## Nguyên tắc Vận hành (Không thương lượng)

- **Không hardcode key dùng chung**: Nếu gặp các từ chung như "Lưu", "Hủy", "Thành công", hãy ưu tiên sử dụng các key chung đã có sẵn trong file gốc (ví dụ: `commonActions.save`, `commonActions.cancel`). Chỉ tạo key con cho các từ đặc thù của màn hình.
- **Merge thay vì ghi đè**: Khi tạo file con, nếu file con đã tồn tại, hãy đọc và merge các key mới vào thay vì ghi đè làm mất các key trước đó của trang.
- **Luôn chạy Script Compile**: Sau khi tạo hoặc cập nhật file i18n con, bắt buộc phải chạy `node codebase/scripts/compile-i18n.js` để đồng bộ. Không bao giờ bỏ qua bước này.
