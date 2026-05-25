# Tài liệu Kỹ thuật: Hệ thống Thông báo (Notification Service)

Tài liệu này giải thích chi tiết các lỗi đã khắc phục và cách hoạt động của hệ thống thông báo sau khi nâng cấp.

---

## 1. Các lỗi đã khắc phục

### 1.1. Lỗi đếm số lượng chưa đọc bị reset về 0
- **Nguyên nhân:**
  - Ở Backend, các thông báo sau khi được gửi sẽ mang trạng thái `status = 'SENT'`.
  - Ở Frontend, DTO của mỗi thông báo được định nghĩa có trường `status: 'UNREAD' | 'READ'`.
  - Khi người dùng click mở danh sách thông báo, Frontend gọi API lấy danh sách và ghi đè `unreadCount` dựa trên logic so khớp:
    `this.unreadCount = this.notifications.filter((n) => n.status === 'UNREAD').length;`
  - Vì Backend trả về `status` là `'SENT'`, phép lọc trên luôn cho ra `0` phần tử. Dẫn tới `unreadCount` bị ghi đè thành `0` ngay lập tức, và badge đỏ biến mất một cách bất thường, các thông báo chưa đọc cũng mất trạng thái chưa đọc (mất dấu chấm xanh).
- **Giải pháp:**
  - Ánh xạ lại trạng thái đọc ở Frontend dựa trên trường thời gian đọc `readAt` từ Backend:
    `status: item.readAt ? 'READ' : 'UNREAD'`
  - Logic này được áp dụng đồng bộ ở cả hàm tải danh sách qua API REST và hàm lắng nghe sự kiện thời gian thực qua WebSocket.

### 1.2. Lỗi hiển thị ngày tháng `Invalid Date`
- **Nguyên nhân:**
  - DTO `NotificationResponse` ở Backend không chứa trường `createdAt` (thời điểm tạo thông báo), trong khi Frontend sử dụng trường này để định dạng và hiển thị thời gian.
- **Giải pháp:**
  - Bổ sung trường `createdAt` (kiểu `OffsetDateTime`) vào record `NotificationResponse` ở Backend.
  - Cập nhật mapper `toResponse` ở `NotificationService.java` để chuyển chính xác giá trị `entity.getCreatedAt()` sang DTO.
  - Sửa đổi hàm ánh xạ ở Frontend để lấy trường `createdAt` (với fallback là `sentAt` hoặc `scheduledAt`).

---

## 2. Tính năng Xem chi tiết thông báo (Premium Detail Modal)

Khi người dùng bấm vào bất kỳ một thông báo nào trong danh sách:
1. **Lưu trạng thái vào DB:** Hệ thống sẽ tự động kiểm tra nếu thông báo đó ở trạng thái `UNREAD` (chưa đọc), Frontend sẽ lập tức gửi một request HTTP POST `/notification/api/notifications/{id}/read` lên Backend.
   - Backend sẽ cập nhật trường `readAt` của thông báo đó thành thời gian hiện tại (`OffsetDateTime.now()`) và lưu vào Database.
   - Frontend cập nhật trạng thái thông báo thành `READ` và giảm số lượng đếm chưa đọc `unreadCount` đi 1 đơn vị.
2. **Hiển thị Modal xem chi tiết:**
   - Một Modal tuyệt đẹp sẽ hiện lên hiển thị đầy đủ Tiêu đề, Nội dung chi tiết dài và Thời gian gửi cụ thể của thông báo đó.
   - Modal được thiết kế theo đúng quy chuẩn **Web Design Backbone Rule** với hiệu ứng kính mờ (glassmorphism), đổ bóng sâu (2xl shadow), hỗ trợ hoàn hảo cả Dark Theme & Light Theme, và responsive tự động co giãn tối ưu trên thiết bị di động.

---

## 3. Cấu trúc các file thay đổi

### 3.1. Backend (`notification-service`)
- `com.mom.notification.controller.dto.NotificationResponse`:
  - Thêm trường `OffsetDateTime createdAt`.
- `com.mom.notification.service.NotificationService`:
  - Cập nhật hàm `toResponse` để truyền `entity.getCreatedAt()` vào constructor.

### 3.2. Frontend
- `src/app/shared/components/notification-bell/notification-bell.component.ts`:
  - Thêm biến `selectedNotification` để theo dõi thông báo đang được chọn.
  - Cập nhật hàm `loadNotifications()` và websocket subscription để map trường `status` dựa theo `readAt`.
  - Thêm các hàm: `selectNotification(n)`, `closeDetail()`, và `formatFullTime(date)` để định dạng đầy đủ ngày giờ Việt Nam.
- `src/app/shared/components/notification-bell/notification-bell.component.html`:
  - Chuyển đổi sự kiện click trên từng item sang `selectNotification(n)`.
  - Bổ sung cấu trúc HTML của Premium Modal xem chi tiết ở cuối file.
- `src/app/shared/components/notification-bell/notification-bell.component.css`:
  - Bổ sung các rule CSS cho Modal (backdrop blur, slide-up animation, dark/light theme, di động responsive).
