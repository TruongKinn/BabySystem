# Research: Baby Vaccination Tracker

**Feature**: Baby Vaccination Tracker
**Date**: 2026-07-26
**Status**: Completed

## 1. Quyết định Thiết kế & Phương án Kỹ thuật

### Quyết định 1: Thiết kế Cơ sở dữ liệu và Tách biệt bảng (Database Design)
- **Lựa chọn**: Tạo mới 2 bảng `vaccines` và `vaccine_schedule_configs`. Đồng thời, cập nhật (migration) bảng `vaccinations` hiện có để liên kết qua `vaccine_id` thay vì lưu tên vắc-xin cứng.
- **Lý do**: 
  - Bảng `vaccines` giúp Admin chuẩn hóa danh mục các loại vắc-xin (nhà sản xuất, công dụng, tổng số mũi).
  - Bảng `vaccine_schedule_configs` lưu cấu hình lộ trình tiêm chuẩn (độ tuổi khuyến nghị, khoảng cách tối thiểu giữa các mũi).
  - Bảng `vaccinations` hiện tại chỉ lưu chuỗi text `vaccine_name` và không hỗ trợ tracking theo lộ trình (thiếu thông tin số mũi, trạng thái POSTPONED). Việc migration chuyển sang khóa ngoại `vaccine_id` và thêm trường `dose_number` là bắt buộc để quản lý lộ trình nâng cao.
- **Giải pháp thay thế đã cân nhắc**: Lưu toàn bộ thông tin lộ trình và vắc-xin trong một cột JSON của bảng em bé. Bị bác bỏ vì khó truy vấn, khó lập lịch quét hằng ngày và không hỗ trợ chỉnh sửa danh mục chung bởi Admin.

### Quyết định 2: Tự động dời lịch và Rescheduling Logic
- **Lựa chọn**: Khi ghi nhận ngày tiêm thực tế của mũi tiêm trước, hệ thống tự động tính toán lại ngày dự kiến của mũi tiếp theo bằng công thức: `actualDate + minDaysSincePreviousDose`.
- **Lý do**: Đảm bảo an toàn y tế. Khoảng cách tối thiểu giữa các mũi vắc-xin (ví dụ: mũi 1 và mũi 2 của 6-trong-1 phải cách nhau 28 ngày) là điều kiện bắt buộc để kháng thể hình thành hiệu quả. Nếu tiêm sớm hơn sẽ không có tác dụng và có hại cho trẻ.
- **Giải pháp thay thế đã cân nhắc**: Chỉ hiển thị cảnh báo và giữ nguyên ngày tiêm dự kiến của mũi tiếp theo, chỉ hiển thị cảnh báo cho Bố/Mẹ tự chú ý. Bị bác bỏ vì có nguy cơ cao gợi ý sai ngày tiêm cho trẻ nếu bố mẹ không chú ý cảnh báo.

### Quyết định 3: Bảo mật và Cô lập dữ liệu (Data Isolation)
- **Lựa chọn**: Tái sử dụng `com.mom.common.security.DataIsolationUtil` từ thư viện dùng chung `common-lib`.
- **Lý do**:
  - `DataIsolationUtil` đã được tích hợp sẵn cơ chế kiểm tra token JWT và header `X-Family-Ids` do API Gateway gửi xuống.
  - Việc gọi `DataIsolationUtil.validateFamilyAccess(baby.getFamilyId())` trước khi xử lý nghiệp vụ giúp đảm bảo chỉ có các tài khoản thuộc cùng Family ID với bé mới có quyền xem hoặc sửa lịch sử tiêm chủng của bé. Điều này bảo vệ dữ liệu y tế nhạy cảm của trẻ em.

### Quyết định 4: Cơ chế Lập lịch và Gửi thông báo (Scheduler & Kafka Messaging)
- **Lựa chọn**:
  - Sử dụng `@Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")` trong `baby-service` để quét hằng ngày vào lúc 07:00 sáng.
  - Khi phát hiện em bé có lịch tiêm trong vòng 3 ngày tới (ngày dự kiến = `today + 3`), hệ thống xuất bản một sự kiện (event) lên Kafka topic `vaccination-reminder-topic`.
  - Dịch vụ `notification-service` sẽ lắng nghe sự kiện này và gửi đồng thời thông báo đẩy (Web Push) qua WebSocket/SSE và gửi Email thông qua SMTP server cấu hình sẵn.
- **Lý do**: Phù hợp với kiến trúc Event-Driven của hệ thống, giúp giảm tải cho dịch vụ `baby-service` bằng cách ủy thác việc gửi email/webpush cho `notification-service`.

## 2. Rủi ro & Giải pháp giảm thiểu (Risks & Mitigations)

- **Rủi ro 1: Lỗi lệch múi giờ (Timezone)**: Khi tính toán `actualDate + minDaysSincePreviousDose` hoặc quét lịch tiêm lúc 07:00 sáng, việc không nhất quán múi giờ giữa Server (thường là UTC) và Việt Nam (UTC+7) có thể dẫn đến việc quét sót ngày hoặc nhắc lịch sai ngày.
  - *Giải pháp*: Toàn bộ ngày tháng lưu trong DB sẽ dùng kiểu dữ liệu `LocalDate` (không múi giờ) đối với ngày tiêm và ngày hẹn tiêm. Việc quét lịch tiêm sẽ sử dụng `LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"))` để đảm bảo đồng bộ.
- **Rủi ro 2: AI OCR nhận diện sai dữ liệu sổ tiêm**: AI có thể trích xuất sai tên vắc-xin hoặc ngày tiêm do chữ viết tay bác sĩ khó đọc.
  - *Giải pháp*: AI OCR chỉ trả về dữ liệu dạng "Xem trước" (Preview Mode). Người dùng bắt buộc phải xem lại, sửa đổi nếu cần và nhấn "Xác nhận lưu" thì dữ liệu mới được ghi vào DB. Nếu không nhận diện được, cung cấp nút chuyển nhanh sang form nhập liệu thủ công.
