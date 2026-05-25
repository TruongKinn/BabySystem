# Tài liệu Khắc phục Lỗi mất i18n Trang Login & Rà soát Hệ thống

## 1. Nguyên nhân lỗi mất i18n ở trang Login (`http://localhost:4200/app/login`)

Qua quá trình rà soát mã nguồn, chúng tôi phát hiện lỗi mất i18n trên trang Login bắt nguồn từ sự bất đồng bộ giữa mã nguồn Component và cấu trúc tệp tin dịch thuật:

1. **Sai cấu trúc Namespace (Prefix Key):**
   - Trong mã nguồn template `login.component.html` và file logic `login.component.ts`, toàn bộ các nhãn hiển thị và thông điệp dịch thuật đều sử dụng prefix là `auth.login` (ví dụ: `auth.login.card.title`, `auth.login.messages.loginFailedTitle`).
   - Tuy nhiên, tệp tin dịch thuật con cũ bị người dùng xóa nhầm hoặc cấu hình sai thư mục dẫn đến việc script compile-i18n tạo ra namespace `app.login` thay vì `auth.login`.

---

## 2. Giải pháp Khắc phục & Khôi phục Bản dịch Gốc (Rollback)

Chúng tôi đã thực hiện khôi phục trọn vẹn và tối ưu hóa hệ thống dịch thuật như sau:

1. **Khôi phục bản dịch gốc (Rollback):**
   - Lục tìm trong lịch sử Git (`vi.json.bak` và `en.json.bak` tại commit `HEAD` trước đó) để khôi phục chính xác 100% bản dịch gốc cực kỳ đầy đủ, sát nghĩa và chất lượng cao của **tiếng Việt** và **tiếng Anh** do bạn đã biên soạn trước đây.
   - Nhờ vậy, tránh được việc dịch mới không sát nghĩa và giữ nguyên văn phong chuyên nghiệp của hệ thống (ví dụ: các thông báo chi tiết về 2FA, Keycloak, CAPTCHA, đổi mật khẩu tạm thời).

2. **Dịch sát nghĩa cho các ngôn ngữ bổ sung:**
   - Biên dịch thủ công và chính xác các khóa này sang **tiếng Nhật (`ja.json`)** và **tiếng Trung (`zh.json`)** dựa trên bản dịch gốc tiếng Việt vừa khôi phục.
   - Lưu trữ toàn bộ các file i18n con tại thư mục chính xác: `codebase/frontend/public/i18n/auth/login/` để script tự động tạo ra namespace `auth.login`.

3. **Cập nhật mã nguồn Component:**
   - Chỉnh sửa file [login.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/auth/login/login.component.ts) để chuyển 3 khóa dịch dùng nhầm prefix `app.login` thành `auth.login.messages...` nhằm đồng bộ 100%.

4. **Đồng bộ hóa (Compile):**
   - Chạy lệnh compile `node codebase/scripts/compile-i18n.js` gộp thành công tất cả vào các file cha chính.

---

## 3. Rà soát Các trang khác bị mất hoặc thiếu i18n

- **Trang Hub Tài liệu (`http://localhost:4200/app/documents`):**
  - **Tình trạng:** Trang này hiện đang **hardcode 100% chữ tiếng Việt trực tiếp vào HTML** (như các tiêu đề *"Document Hub & Nhập liệu thông minh"*, các nút bấm, mô tả kéo thả, tab, các bảng xem trước Excel, thông báo kết quả nhập hàng loạt, v.v.). Trang này hoàn toàn không sử dụng pipe dịch thuật `| translate` hay tiêm `I18nService` vào controller.
  - **Đề xuất:** Cần chuyển đổi toàn bộ text cứng trên trang này thành các key dịch thuật thuộc namespace `momApp.documents` (hoặc tương tự) và tạo tệp dịch tương ứng để đảm bảo tính đa ngôn ngữ cho hệ thống.
