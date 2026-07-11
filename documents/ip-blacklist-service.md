# Tài liệu Kỹ thuật & Hướng dẫn Sử dụng IP Blacklist Service

Tài liệu này hướng dẫn chi tiết cách thức hoạt động, cấu trúc API và cách quản lý tính năng chặn địa chỉ IP (IP Blacklisting) để bảo vệ hệ thống trước các đợt tấn công từ bên ngoài.

---

## 1. Kiến trúc & Nguyên lý hoạt động

Cơ chế chặn IP được triển khai theo mô hình tập trung sử dụng **Redis** làm kho lưu trữ Blacklist IP thời gian thực, giúp API Gateway kiểm tra và từ chối các request từ IP xấu với độ trễ cực thấp (< 2ms).

```
   Client Req
       │
       ▼
┌──────────────┐
│ API Gateway  │ ──(1. Check client IP in Redis)──> ┌──────────────┐
│ (Reactive    │                                    │  Redis DB    │
│  IpBlock     │ <──(2. IP is in Blacklist: YES)─── └──────────────┘
│  Filter)     │
└──────┬───────┘
       │ (Reject immediately)
       ▼
 HTTP 403 Forbidden
```

### Chi tiết các tầng xử lý:
1. **API Gateway (`api-gateway`):**
   * Lớp lọc `IpBlockFilter` (Global Filter) chạy trước tất cả các filter nghiệp vụ khác (`Ordered.HIGHEST_PRECEDENCE`).
   * Trích xuất địa chỉ IP thực của client từ request header `X-Forwarded-For` (hỗ trợ môi trường chạy sau Load Balancer hoặc Cloudflare Proxy) hoặc lấy Remote Address mặc định của kết nối socket.
   * Truy vấn nhanh Redis key `blacklist:ip:<ip_address>` qua mô hình reactive non-blocking.
   * Nếu key tồn tại, request bị hủy ngay lập tức và trả về mã lỗi `HTTP 403 Forbidden` cùng JSON phản hồi bảo mật.
2. **Authentication Service (`authentication-service`):**
   * Cung cấp REST Controller `/admin/ip-blacklist` dùng để thao tác ghi/đọc/xóa danh sách IP chặn trên Redis thông qua Spring `StringRedisTemplate`.
3. **Admin Portal (Frontend Angular):**
   * Giao diện cấu hình trực quan cho phép ban quản trị theo dõi danh sách, thêm IP cần chặn và gỡ khóa nhanh chóng.

---

## 2. Đặc tả REST API (Tầng Quản trị)

Các API này yêu cầu quyền **ADMIN** để truy cập và thực thi.

### 2.1. Lấy danh sách IP bị chặn
* **Endpoint:** `GET /auth/admin/ip-blacklist`
* **Mô tả:** Quét tất cả các key dạng `blacklist:ip:*` trên Redis và giải mã dữ liệu metadata.
* **Response mẫu (`200 OK`):**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "ip": "1.2.3.4",
      "reason": "Spam login brute-force",
      "blockedAt": "2026-07-11T14:56:00Z",
      "expiryTime": "2026-07-11T15:56:00Z",
      "ttl": 3540
    }
  ]
}
```

### 2.2. Chặn địa chỉ IP
* **Endpoint:** `POST /auth/admin/ip-blacklist`
* **Payload request:**
```json
{
  "ip": "1.2.3.4",
  "reason": "Tấn công DDoS",
  "durationSeconds": 3600
}
```
* **Lưu ý:**
  * `durationSeconds = 0` nghĩa là chặn **Vĩnh viễn** (không gán TTL cho key Redis).
  * `durationSeconds > 0` key tự động hết hạn và biến mất khỏi Redis sau số giây được chỉ định.
* **Response mẫu (`200 OK`):**
```json
{
  "success": true,
  "message": "IP blocked successfully",
  "data": null
}
```

### 2.3. Gỡ chặn địa chỉ IP
* **Endpoint:** `DELETE /auth/admin/ip-blacklist/{ip}`
* **Mô tả:** Xóa key `blacklist:ip:{ip}` ra khỏi Redis để khôi phục quyền truy cập cho client.
* **Response mẫu (`200 OK`):**
```json
{
  "success": true,
  "message": "IP unblocked successfully",
  "data": null
}
```

---

## 3. Hướng dẫn Sử dụng trên Giao diện Admin

1. Truy cập trang quản trị và vào mục **Security -> IP Blacklist** trên Sidebar.
2. **Thêm IP chặn mới:**
   * Nhập địa chỉ IPv4 (ví dụ: `1.2.3.4`) hoặc IPv6 cần chặn.
   * Nhập lý do chặn (để các admin khác tiện theo dõi).
   * Chọn thời gian chặn (1 giờ, 6 giờ, 24 giờ hoặc vĩnh viễn).
   * Nhấp nút **Chặn IP này** (Block IP).
3. **Danh sách IP bị chặn:**
   * Xem thời gian đếm ngược (TTL) thực tế của các IP bị chặn có thời hạn.
   * Nhấp nút **Gỡ chặn** (Unblock) để khôi phục quyền truy cập ngay lập tức cho IP tương ứng.
