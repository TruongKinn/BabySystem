# Quickstart & Verification Guide: Baby Vaccination Tracker

**Feature**: Baby Vaccination Tracker
**Date**: 2026-07-26
**Status**: Completed

Tài liệu này hướng dẫn cách kiểm thử và xác minh tính năng **Baby Vaccination Tracker** chạy thực tế trên môi trường cục bộ (local).

---

## 1. Điều kiện tiên quyết & Chuẩn bị môi trường

1.  **Hạ tầng Docker**: Khởi chạy toàn bộ hạ tầng (PostgreSQL, Kafka, Keycloak, Vault) tại `codebase/infrastructure`:
    ```bash
    cd codebase/infrastructure
    docker compose up -d
    ```
2.  **Khởi động Keycloak & Nạp cấu hình**: Đảm bảo các tài khoản demo hoạt động (ví dụ: `demo.user` và tài khoản có quyền `ROLE_ADMIN`).
3.  **Khởi động các Microservices**:
    - **authentication-service** (Port 8081)
    - **api-gateway** (Port 8080)
    - **baby-service** (Port 8084)
    - **notification-service** (Port 8098)
    - **ai-service** (Port 8090)

---

## 2. Kịch bản Xác minh (Verification Scenarios)

### Kịch bản 1: Lấy Token xác thực thông qua API Gateway

Sử dụng `curl` để lấy JWT token từ Keycloak cho 2 vai trò Admin và User.

*   **Lấy Token User (`demo.user`)**:
    ```bash
    curl -X POST http://localhost:8080/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "demo.user", "password": "demo123"}'
    ```
    *Lưu lại access token nhận được trong biến môi trường `$USER_TOKEN`.*

*   **Lấy Token Admin**:
    ```bash
    curl -X POST http://localhost:8080/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username": "admin.user", "password": "adminpassword"}'
    ```
    *Lưu lại access token nhận được trong biến môi trường `$ADMIN_TOKEN`.*

---

### Kịch bản 2: Admin cấu hình Danh mục Vắc-xin & Lộ trình tiêm chủng

1.  **Tạo mới Vắc-xin 6-trong-1**:
    ```bash
    curl -X POST http://localhost:8080/api/vaccines \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "6-in-1 Hexaxim",
        "manufacturer": "Sanofi (Pháp)",
        "diseasePrevented": "Bạch hầu, Ho gà, Uốn ván, Bại liệt, Viêm gan B, Hib",
        "totalDoses": 3,
        "description": "Vắc-xin phối hợp phòng 6 bệnh truyền nhiễm."
      }'
    ```
    *Hệ thống trả về ID vắc-xin vừa tạo (ví dụ: `1`).*

2.  **Cấu hình lộ trình mũi 1 (Lúc 2 tháng tuổi)**:
    ```bash
    curl -X POST http://localhost:8080/api/vaccines/1/schedule-configs \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "doseNumber": 1,
        "recommendedAgeMonths": 2,
        "minDaysSincePreviousDose": 0
      }'
    ```

3.  **Cấu hình lộ trình mũi 2 (Lúc 3 tháng tuổi, cách mũi 1 tối thiểu 28 ngày)**:
    ```bash
    curl -X POST http://localhost:8080/api/vaccines/1/schedule-configs \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "doseNumber": 2,
        "recommendedAgeMonths": 3,
        "minDaysSincePreviousDose": 28
      }'
    ```

---

### Kịch bản 3: User theo dõi lộ trình & xác nhận hoàn thành tiêm chủng

1.  **Lấy lộ trình tiêm chủng của bé (Ví dụ Baby ID = 5, thuộc nhóm gia đình của User)**:
    ```bash
    curl -X GET http://localhost:8080/api/babies/5/vaccinations \
      -H "Authorization: Bearer $USER_TOKEN"
    ```
    *Hệ thống trả về danh sách lịch tiêm với trạng thái `PENDING`. Mũi 1 có ngày dự kiến `due_date` dựa trên ngày sinh của bé cộng 2 tháng.*

2.  **Xác nhận đã tiêm mũi 1 (Vaccination ID = 301)**:
    ```bash
    curl -X POST http://localhost:8080/api/babies/5/vaccinations/301/complete \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "actualDate": "2026-08-01",
        "facility": "VNVC Hà Đông",
        "postReaction": "Bé hơi ấm đầu 37.8 độ",
        "notes": "Đã tiêm thành công"
      }'
    ```
    *Hệ thống trả về trạng thái `COMPLETED`.*

3.  **Kiểm tra tính tự động dời lịch mũi 2**:
    Gọi lại API lấy lịch tiêm:
    ```bash
    curl -X GET http://localhost:8080/api/babies/5/vaccinations \
      -H "Authorization: Bearer $USER_TOKEN"
    ```
    *Xác minh: Mũi 2 (Vaccination ID = 302) hiện đã tự động cập nhật `due_date` là ngày `2026-08-29` (Ngày tiêm mũi 1 `2026-08-01` + 28 ngày tối thiểu giãn cách).*

---

### Kịch bản 4: Xác minh tính cô lập dữ liệu (Data Isolation check)

1.  **Sử dụng token của User A để gọi lịch tiêm của em bé thuộc gia đình của User B (Baby ID = 10)**:
    ```bash
    curl -i -X GET http://localhost:8080/api/babies/10/vaccinations \
      -H "Authorization: Bearer $USER_A_TOKEN"
    ```
    *Xác minh kết quả: Hệ thống bắt buộc phải trả về mã lỗi `403 Forbidden` cùng thông báo từ chối truy cập do vi phạm cô lập Family ID.*

---

### Kịch bản 5: Kiểm thử tác vụ gửi thông báo nhắc lịch tự động (Cron Job & Kafka Integration)

1.  **Tạo ngày tiêm dự kiến của bé nằm trong khoảng 3 ngày tới** (để kích hoạt trigger nhắc nhở).
2.  **Kích hoạt thủ công Scheduler quét lịch tiêm** (hoặc đợi chạy tự động vào 07:00 sáng).
3.  **Lắng nghe sự kiện trên Kafka topic** để kiểm tra tin nhắn nhắc lịch được đẩy đi thành công:
    ```bash
    docker exec -it codebase-kafka-1 kafka-console-consumer \
      --bootstrap-server localhost:9092 \
      --topic vaccination-reminder-topic \
      --from-beginning
    ```
    *Xác minh: Kafka console hiển thị message dạng JSON chứa: `babyId`, `babyName`, `vaccineName`, `familyId`, `plannedDate`.*
4.  **Kiểm tra logs của `notification-service`**:
    Xem logs để xác nhận dịch vụ đã tiêu thụ (consume) tin nhắn từ Kafka thành công và kích hoạt gửi Web Push/Email nhắc nhở.
