# Tài liệu Thiết kế: Bộ chọn Ngôn ngữ Trang Đăng ký & Đăng nhập (Auth Service)

Tài liệu này lưu trữ thông tin thiết kế và cấu trúc giao diện bộ chọn ngôn ngữ (Language Selector) cho các dịch vụ Đăng ký và Đăng nhập của ứng dụng BabySystem.

## Vị trí hiển thị
- Được định vị ở góc trên bên phải của trang Đăng nhập và Đăng ký.
- Định vị tuyệt đối `position: absolute; top: 24px; right: 24px; z-index: 100` để đảm bảo luôn hiển thị nổi bật trên cả desktop và mobile mà không làm vỡ bố cục grid của form đăng nhập.

## Cấu trúc Giao diện (HTML)
Bộ chọn gồm 2 thành phần chính:
1. **Language Trigger Button**: Nút bấm hiển thị cờ nước và mã viết tắt của ngôn ngữ hiện tại (ví dụ: 🇻🇳 VI), kèm theo một icon caret chỉ hướng mở rộng dropdown.
2. **Dropdown List Menu**: Bảng chọn ngôn ngữ với hiệu ứng Glassmorphism mờ sang trọng, hiển thị danh sách 4 ngôn ngữ:
   - 🇻🇳 Tiếng Việt
   - 🇬🇧 English
   - 🇯🇵 日本語
   - 🇨🇳 中文

## Các Hiệu ứng CSS & Premium Touch
- **Glassmorphism**: Dropdown sử dụng hiệu ứng kính mờ `backdrop-filter: blur(12px)` kết hợp với nền trắng đục nhẹ `background: rgba(255, 255, 255, 0.8)` và viền phản chiếu ánh sáng siêu mịn `1px solid rgba(255, 255, 255, 0.25)`.
- **Transitions**: Sử dụng cubic-bezier cho tất cả các chuyển động:
  - Khi hover vào nút chọn hoặc các item: Thay đổi màu nền nhẹ nhàng, nâng nhẹ hoặc trượt êm ái.
  - Khi dropdown xuất hiện: Animation fade-in kết hợp với trượt xuống từ trên nhẹ nhàng (`transform: translateY(-8px) -> translateY(0)`).
  - Khi xoay icon caret (`transform: rotate(0deg) -> rotate(180deg)`).
- **Shadow**: Dòng đổ bóng 3 lớp mềm mại giúp dropdown tách biệt khỏi nền một cách tự nhiên.
- **Accessibility & Focus**: Đảm bảo touch-target chuẩn >= 40px và có hiệu ứng focus rõ ràng.

## Lô-gíc Hoạt động (TypeScript)
- Sử dụng `I18nService` để đọc ngôn ngữ hiện tại và thay đổi ngôn ngữ ngay khi người dùng chọn.
- Xử lý đóng dropdown thông minh:
  - Tự động đóng dropdown khi click vào một ngôn ngữ khác.
  - Sử dụng `@HostListener('document:click')` để tự động đóng dropdown khi người dùng click ra bất kỳ vị trí nào bên ngoài bộ chọn ngôn ngữ.
- Hàm trả về Emoji cờ tương ứng dựa vào mã quốc gia để làm giao diện thêm sinh động.
