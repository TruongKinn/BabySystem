# Tài liệu chuẩn hóa i18n cho trang Hồ sơ cá nhân (Profile)

Tài liệu này ghi chép lại quá trình nâng cấp, chuẩn hóa đa ngôn ngữ (i18n) cho màn hình Hồ sơ cá nhân tại route `/app/profile`.

## 1. Tổng quan thay đổi

Để đáp ứng tiêu chuẩn hệ thống sạch và module hóa tốt hơn:
* **Chuyển đổi Namespace:** Chuyển đổi toàn bộ các tiền tố dịch từ namespace cha `momApp.profile.*` sang namespace con đặc thù của route `app.profile.*`.
* **Xử lý chuỗi cứng (Hardcoded text):** Dịch 100% các nhãn tĩnh, các text placeholder, tiêu đề modal, lỗi biểu mẫu trong file HTML, và các câu thông báo Toast bật ra từ file TypeScript.
* **Hỗ trợ 4 ngôn ngữ:** Đồng bộ đầy đủ đồng thời cả 4 file dịch con:
  * Tiếng Việt (`vi.json`)
  * Tiếng Anh (`en.json`)
  * Tiếng Trung (`zh.json`)
  * Tiếng Nhật (`ja.json`)

## 2. Cấu trúc thư mục dịch con

Các tệp tin dịch con nằm tại thư mục:
`codebase/frontend/public/i18n/app/profile/`

```
app/profile/
├── vi.json  (Tiếng Việt)
├── en.json  (Tiếng Anh)
├── zh.json  (Tiếng Trung)
└── ja.json  (Tiếng Nhật)
```

## 3. Nội dung khóa dịch thuật chuẩn hóa

Dưới đây là sơ đồ tóm tắt cấu trúc các khóa dịch thuật i18n được sử dụng trong màn hình Profile:

```json
{
  "changeAvatar": "Thay đổi ảnh đại diện / Change avatar / ...",
  "uploading": "Đang tải lên... / Uploading... / ...",
  "uploadHint": "Chỉ chấp nhận tệp ảnh, dung lượng tối đa 30MB.",
  "usernameLabel": "Tên tài khoản",
  "emailLabel": "Địa chỉ Email",
  "stats": {
    "members": "Thành viên",
    "family": "Gia đình",
    "role": "Vai trò",
    "active": "Hoạt động",
    "status": "Trạng thái"
  },
  "cards": {
    "account": {
      "title": "Thông tin tài khoản",
      "subtitle": "Thông tin định danh và đăng nhập",
      "displayName": "Tên hiển thị",
      "status": "Trạng thái",
      "activeStatus": "Đang hoạt động"
    },
    "familyRole": {
      "title": "Vai trò gia đình",
      "subtitle": "Vị trí và mối quan hệ trong hộ gia đình",
      "primaryRole": "Vai trò chính trong gia đình",
      "memberCount": "Số lượng thành viên",
      "memberUnit": "người"
    },
    "premium": {
      "title": "Đặc quyền Premium",
      "subtitle": "Các tính năng cao cấp hiện có của hộ gia đình"
    },
    "security": {
      "title": "Bảo mật & Cài đặt",
      "subtitle": "Cấu hình bảo mật tài khoản cá nhân",
      "password": {
        "title": "Mật khẩu",
        "subtitle": "Thay đổi mật khẩu định kỳ để bảo vệ tài khoản",
        "status": "Được bảo vệ",
        "changeBtn": "Thay đổi",
        "oldPasswordLabel": "Mật khẩu cũ",
        "oldPasswordPlaceholder": "Nhập mật khẩu cũ của bạn",
        "oldPasswordError": "Vui lòng nhập mật khẩu cũ",
        "newPasswordLabel": "Mật khẩu mới",
        "newPasswordPlaceholder": "Nhập mật khẩu mới",
        "newPasswordError": "Mật khẩu phải từ 8-20 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
        "confirmPasswordLabel": "Xác nhận mật khẩu mới",
        "confirmPasswordPlaceholder": "Nhập lại mật khẩu mới",
        "confirmRequired": "Vui lòng xác nhận mật khẩu mới của bạn",
        "confirmMismatch": "Xác nhận mật khẩu mới không khớp",
        "submit": "Cập nhật mật khẩu",
        "successTitle": "Thay đổi mật khẩu thành công!",
        "changeErrorFallback": "Thay đổi mật khẩu thất bại!"
      },
      "session": { ... },
      "notifications": { ... }
    }
  },
  "premium": {
    "enabled": "Đã kích hoạt",
    "disabled": "Chưa kích hoạt",
    "empty": "Cấu hình Premium hiện chưa khả dụng.",
    "expiresAt": "Hạn dùng đến",
    "featureLabels": {
      "advanced_growth_tracking": "Theo dõi tăng trưởng nâng cao",
      "smart_reminders": "Nhắc việc thông minh",
      "ai_care_assistant": "Trợ lý chăm sóc AI",
      "premium_reports": "Báo cáo Premium",
      "family_collaboration_plus": "Cộng tác gia đình Plus",
      "baby_journey_plus": "Baby Journey+",
      "medical_vault_export": "Xuất hồ sơ y tế",
      "unlimited_memory": "Bộ nhớ không giới hạn",
      "currency_exchange": "Chuyển đổi tiền tệ",
      "theme_customization": "Tùy biến giao diện"
    }
  },
  "familyTree": {
    "title": "Cây gia đình",
    "subtitle": "Sơ đồ phả hệ mối quan hệ trong hộ gia đình.",
    "empty": "Chưa có dữ liệu cây phả hệ cho gia đình này.",
    "babyBoy": "Con trai",
    "babyGirl": "Con gái",
    "babyChild": "Con"
  },
  "actions": {
    "editProfile": "Chỉnh sửa Profile",
    "exportPdf": "Xuất PDF"
  },
  "editProfileModal": {
    "title": "Chỉnh sửa Profile",
    "subtitle": "Cập nhật thông tin cá nhân của bạn",
    "displayNameLabel": "Tên hiển thị",
    "displayNamePlaceholder": "Nhập tên hiển thị của bạn",
    "displayNameError": "Vui lòng nhập tên hiển thị",
    "emailLabel": "Email",
    "emailPlaceholder": "Nhập địa chỉ email",
    "emailRequired": "Vui lòng nhập địa chỉ email",
    "emailInvalid": "Định dạng email không hợp lệ",
    "dobLabel": "Ngày sinh",
    "dobPlaceholder": "Chọn ngày sinh",
    "submit": "Lưu thay đổi",
    "success": "Cập nhật profile thành công!",
    "failed": "Cập nhật profile thất bại!"
  },
  "pdfModal": {
    "title": "Báo cáo Profile cá nhân",
    "subtitle": "Bản xem trước tài liệu PDF chính thức",
    "loading": "Đang chuẩn bị báo cáo PDF...",
    "failed": "Không thể tải báo cáo PDF!"
  },
  "2fa": {
    "title": "Thiết lập 2FA",
    "subtitle": "Bảo vệ tài khoản với xác thực 2 bước",
    "disableSubtitle": "Xác nhận huỷ bảo mật 2 lớp",
    "generateSecretError": "Không thể khởi tạo mã QR xác thực 2 bước!",
    "otpLengthWarning": "Vui lòng nhập đầy đủ mã xác thực 6 chữ số!",
    "invalidOtpError": "Mã xác thực OTP không hợp lệ hoặc đã hết hạn!",
    "disableFailedError": "Tắt xác thực 2 bước thất bại!",
    "step1": "Bước 1: Cài ứng dụng xác thực",
    "step1Desc": "Tải Google Authenticator hoặc Microsoft Authenticator trên điện thoại.",
    "step2": "Bước 2: Quét mã QR",
    "step2Desc": "Mở ứng dụng xác thực và quét mã QR bên dưới.",
    "step3": "Bước 3: Nhập mã xác thực",
    "step3Desc": "Nhập mã 6 số từ ứng dụng xác thực của bạn",
    "secretLabel": "Mã thiết lập thủ công:",
    "remainingTime": "Mã mới sau: {{time}}s",
    "cancel": "Huỷ bỏ",
    "enable": "Kích hoạt xác thực 2 bước",
    "disableTitle": "Tắt xác thực 2 bước",
    "disableConfirm": "Bạn có chắc chắn muốn tắt tính năng xác thực 2 bước (2FA)? Tài khoản của bạn sẽ giảm mức độ bảo mật.",
    "disableSuccess": "Đã tắt xác thực 2 bước thành công!",
    "enableSuccess": "Kích hoạt xác thực 2 bước thành công!",
    "appStore": "App Store",
    "googlePlay": "Google Play",
    "downloadTitle": "Chưa có ứng dụng? Tải Google Authenticator tại:",
    "status": {
      "title": "Xác thực 2 bước (2FA)",
      "desc": "Tăng cường bảo mật cho tài khoản bằng mã OTP",
      "enabled": "Đã bật",
      "disabled": "Chưa bật",
      "setup": "Thiết lập",
      "turnOff": "Tắt 2FA"
    }
  }
}
```

## 4. Giao thức Biên dịch và Đồng bộ hóa

Sau khi tạo hoặc chỉnh sửa bất kỳ tệp dịch con nào trong thư mục `app/profile/` hoặc các route khác, bạn **bắt buộc** phải chạy lệnh compile sau để đồng bộ dữ liệu vào các tệp dịch chính ở thư mục root (`public/i18n/*.json`):

```bash
node codebase/scripts/compile-i18n.js
```

Script này sẽ tự động tìm kiếm các tệp dịch con, thực hiện deep-merge theo từng ngôn ngữ và xuất ra tệp cha mới đồng thời sao lưu (`.bak`) để đảm bảo an toàn dữ liệu.
