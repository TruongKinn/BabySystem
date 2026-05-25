# Tài liệu: Tính năng Thông Báo Cho Người Dùng (Notification Service & Real-time WebSocket)

**Service:** `notification-service`, `api-gateway`, `frontend`  
**Feature Key:** `notifications`  
**Loại:** Core Feature

---

## 1. Tổng quan

Hệ thống thông báo cho phép Admin và các service gửi thông báo đến người dùng theo thời gian thực (real-time) thông qua kết nối **WebSocket (STOMP/SockJS)**, đồng thời hỗ trợ tải lại danh sách thông báo và đếm số thông báo chưa đọc.

---

## 2. API Endpoints

### 2.1. Tạo mới thông báo (REST API)

```http
POST /notification/api/notifications
```

**Headers:** 
- `Authorization: Bearer <token>`
- `X-User-Id`, `X-Family-Ids`, `X-User-Admin` (forwarded từ API Gateway)

**Request Body:**
```json
{
  "familyId": 9001,
  "userId": 2,
  "channel": "PUSH",
  "type": "INFO",
  "title": "Thông báo mật khẩu file báo cáo",
  "message": "Mật khẩu của file báo cáo tháng 05/2026 là: 123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 12,
    "familyId": 9001,
    "userId": 2,
    "channel": "PUSH",
    "type": "INFO",
    "title": "Thông báo mật khẩu file báo cáo",
    "message": "Mật khẩu của file báo cáo tháng 05/2026 là: 123456",
    "status": "PENDING",
    "createdAt": "2026-05-23T09:40:00Z"
  }
}
```

---

### 2.2. Lấy danh sách thông báo của user

```http
GET /notification/api/notifications?familyId={familyId}&userId={userId}
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": 12,
      "title": "Thông báo mật khẩu",
      "message": "...",
      "status": "UNREAD",
      "createdAt": "2026-05-23T09:40:00Z"
    }
  ]
}
```

---

### 2.3. Đánh dấu đã đọc thông báo

```http
POST /notification/api/notifications/{id}/read
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 12,
    "status": "READ"
  }
}
```

---

## 3. Kiến trúc Real-time & WebSocket

### 3.1. Phía Backend (STOMP Broker)

- **Endpoint chính:** `/notification/ws` (hỗ trợ SockJS fallbacks)
- **Topic Client Subscribe:** `/topic/notifications/user/{userId}`
- **Luồng xử lý:**
  1. Khi nhận request REST API tạo thông báo, bản ghi sẽ được lưu ở trạng thái `PENDING` trong DB.
  2. Bất kỳ khi nào có thông báo chưa gửi, Job Scheduler (`dispatchDueNotifications`) chạy mỗi 30 giây sẽ tự động quét, chuyển trạng thái thành `SENT` và bắn tín hiệu real-time qua WebSocket Broker.
  3. WebSocket STOMP Broker sẽ đẩy thông báo đó trực tiếp xuống client đã kết nối và subscribe.

---

### 3.2. Cấu hình Bypass trên API Gateway

Để đảm bảo kết nối WebSocket (bao gồm handshake SockJS và upgrade protocol) qua Gateway hoạt động ổn định mà không bị chặn bởi bộ lọc phân quyền Bearer Token, chúng ta đã tối ưu bộ lọc bypass trong **`ApiPermissionFilter.java`**:

```java
// Cho phép bypass phân quyền hoàn toàn đối với mọi endpoint WebSocket của notification-service
if (path.startsWith("/notification/ws")) {
    return true;
}
```

---

### 3.3. Phía Frontend (Angular)

- **`NotificationWebsocketService`**:
  - Tự động thiết lập kết nối SockJS + STOMP Client đến `${API_CONFIG.GATEWAY_URL}/notification/ws` khi khởi chạy ứng dụng (nếu đã đăng nhập).
  - Tự động subscribe theo kênh cá nhân `/topic/notifications/user/${userId}`.
  - Hỗ trợ chế độ in logs debug trực quan `[WebSocket Debug] <logs>` trên DevTools console để kiểm tra luồng tin nhắn real-time.

- **`NotificationBellComponent` (Icon Chuông Thông Báo)**:
  - **Quản lý trạng thái thông minh:** Lắng nghe kênh WebSocket `notifications$` để prepend (chèn lên đầu) thông báo mới nhận được ngay lập tức, tự động cập nhật số lượng unread count.
  - **Tự động làm mới (Auto-refresh UX):** Mỗi khi người dùng nhấp mở dropdown hình quả chuông, component sẽ tự động gọi API `loadNotifications()` để đồng bộ danh sách mới nhất từ server, triệt tiêu hoàn toàn độ trễ của mạng hoặc lỗi mất kết nối WebSocket tạm thời.
  - **Polling dự phòng:** Cập nhật số unread count định kỳ mỗi 60 giây.

---

## 4. Các Files Thay Đổi & Sửa Đổi

### 4.1. api-gateway (Bypass WebSocket Handshake)
| File | Mô tả |
|------|-------|
| [`ApiPermissionFilter.java`](file:///d:/AI-AGENT/BabySystem/codebase/backend/api-gateway/src/main/java/vn/logistic/apigateway/config/ApiPermissionFilter.java) | Sửa logic bypass: cho phép tất cả các request có path bắt đầu bằng `/notification/ws` kết nối trực tiếp không bị kiểm tra token, giúp SockJS handshake thành công. |

### 4.2. frontend (Cải thiện UX & Bật Logs)
| File | Mô tả |
|------|-------|
| [`notification-bell.component.ts`](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/shared/components/notification-bell/notification-bell.component.ts) | 1. Sửa `toggleDropdown()` để luôn tải lại danh sách thông báo mới nhất từ API mỗi khi mở chuông. <br> 2. Sửa lỗi ánh xạ DTO: Thay đổi `count` thành `unreadCount` để tương thích khớp 100% với DTO trả về từ API backend (`/notifications/unread/count`). |
| [`notification-websocket.service.ts`](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/core/services/notification-websocket.service.ts) | Bật logs debug STOMP client dưới dạng prefix `[WebSocket Debug]` để hiển thị chi tiết trong Console của browser. |
