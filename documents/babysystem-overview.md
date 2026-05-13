# BabySystem – Tài Liệu Tổng Quan Dự Án

> **Cập nhật lần cuối:** 2026-05-13  
> **Phiên bản:** 2.0.0 (Sprint 2)

---

## 1. Giới Thiệu

**BabySystem** (MOM App) là một hệ thống quản lý gia đình hiện đại được xây dựng theo kiến trúc **Microservices**. Hệ thống hỗ trợ các gia đình quản lý thông tin em bé, công việc hàng ngày, bữa ăn, chi tiêu, danh sách mua sắm và các thông tin gia đình thông qua một ứng dụng web đa ngôn ngữ.

---

## 2. Kiến Trúc Hệ Thống

```
Client (Angular SPA)
        │
        ▼
  API Gateway (8080)
        │
   ┌────┴────────────────────────────────────────────────┐
   │                                                     │
   ▼                                                     │
Auth Service (8081)                                      │
   │                                                     │
   └──────────────────────────────────────────────────── ┘
        │
   ┌────┼────────────────────────────────────────────────┐
   ▼    ▼          ▼          ▼         ▼        ▼       ▼
Account  Baby   Task    Meal   Expense  Shopping  Insight  File
Service Service Service Service Service Service  Service  Service
   │                                                        │
   ▼                                                        ▼
PostgreSQL                                               MinIO
   │
Kafka (Event Bus)
   │
Notification Service
```

### Các thành phần hạ tầng

| Thành phần | Image | Port | Mô tả |
|---|---|---|---|
| PostgreSQL | postgres:16-alpine | 5432 | CSDL chính |
| Redis | redis:7-alpine | 6379 | Cache & session |
| Kafka | cp-kafka:7.5.3 | 9092 | Message broker |
| Zookeeper | cp-zookeeper:7.5.3 | 2181 | Kafka coordinator |
| Kafka UI | kafka-ui:v0.7.2 | 8085 | Quản lý Kafka |
| Vault | hashicorp/vault:1.16 | 8200 | Quản lý secret |
| MinIO | minio:RELEASE.2025-07-23 | 9000/9001 | Object storage |

---

## 3. Danh Sách Microservices

### 3.1 API Gateway
- **Vai trò:** Điểm vào duy nhất cho toàn bộ hệ thống
- **Port:** 8080
- **Chức năng:** Định tuyến request, xác thực JWT, load balancing

### 3.2 Authentication Service
- **Vai trò:** Xác thực người dùng
- **Chức năng:** Đăng nhập, đăng xuất, cấp phát JWT token, refresh token
- **Tích hợp:** Redis (lưu refresh token), Vault (lấy secret key)

### 3.3 Account Service
- **Vai trò:** Quản lý người dùng và gia đình
- **API chính:**
  - `POST /api/users` – Tạo người dùng mới
  - `GET /api/users/{id}` – Lấy thông tin người dùng
  - `POST /api/families` – Tạo gia đình mới
  - `GET /api/families/{id}` – Lấy thông tin gia đình
  - `POST /api/families/{id}/members` – Thêm thành viên vào gia đình
- **Sự kiện Kafka:** Publish sự kiện khi tạo user/family

### 3.4 Baby Service
- **Vai trò:** Quản lý thông tin em bé
- **Chức năng:** CRUD thông tin em bé (tên, ngày sinh, giới tính, ghi chú)
- **Sự kiện Kafka:** Lắng nghe sự kiện tạo gia đình

### 3.5 Task Service
- **Vai trò:** Quản lý công việc gia đình
- **Chức năng:** Tạo, hoàn thành, theo dõi công việc có hạn chót
- **DTO:** `TaskPendingCountResponse` – Trả về số lượng task đang chờ theo gia đình
- **Sự kiện Kafka:** Publish sự kiện hoàn thành task

### 3.6 Meal Service
- **Vai trò:** Quản lý bữa ăn
- **Chức năng:** Lên kế hoạch bữa ăn, theo dõi dinh dưỡng
- **Sự kiện Kafka:** Publish/subscribe sự kiện liên quan đến bữa ăn

### 3.7 Expense Service
- **Vai trò:** Quản lý chi tiêu gia đình
- **Chức năng:** Ghi chép, phân loại và thống kê chi tiêu
- **Sự kiện Kafka:** Publish sự kiện khi có giao dịch mới

### 3.8 Shopping Service
- **Vai trò:** Quản lý danh sách mua sắm
- **Chức năng:** Tạo và quản lý danh sách hàng hóa cần mua

### 3.9 Insight Service
- **Vai trò:** Phân tích và báo cáo
- **Chức năng:** Tổng hợp dữ liệu từ các service để tạo báo cáo thống kê

### 3.10 File Service
- **Vai trò:** Quản lý tệp tin và ảnh
- **Chức năng:** Upload/download file, tích hợp MinIO
- **Storage:** MinIO Object Storage

### 3.11 Notification Service
- **Vai trò:** Gửi thông báo
- **Chức năng:** Lắng nghe sự kiện Kafka và gửi thông báo cho người dùng

---

## 4. Common Library

`common-lib` là thư viện dùng chung giữa các microservice, cung cấp:
- `ApiResponse<T>` – Chuẩn hóa định dạng response API
- Các DTO dùng chung
- Utilities và helpers

---

## 5. Frontend (Angular SPA)

### Công nghệ sử dụng
- **Framework:** Angular (Standalone Components)
- **UI Library:** NG-ZORRO Ant Design
- **State Management:** RxJS BehaviorSubject
- **I18n:** ngx-translate (hỗ trợ Tiếng Việt & Tiếng Anh)

### Cấu trúc module

| Module | Đường dẫn | Mô tả |
|---|---|---|
| App | `/app` | Layout chính, navigation |
| Auth | `/auth` | Đăng nhập |
| Dashboard | `/dashboard` | Trang tổng quan |
| Home | `/home` | Trang chủ |
| Baby | `/baby` | Quản lý em bé |
| Tasks | `/tasks` | Quản lý công việc |
| Meals | `/meals` | Quản lý bữa ăn |
| Expenses | `/expenses` | Quản lý chi tiêu |
| Shopping | `/shopping` | Danh sách mua sắm |
| Insights | `/insights` | Báo cáo thống kê |
| Family | `/family` | Thông tin gia đình |
| Profile | `/profile` | Hồ sơ cá nhân |
| Settings | `/settings` | Cài đặt |

### Services Frontend
- **MockSuperAppService** – Service mock dữ liệu cho phát triển
- **SuperAppCommandService** – Service gọi API thực tế (write operations)
- **I18nService** – Service quản lý ngôn ngữ

### Tính năng i18n
- Hỗ trợ 2 ngôn ngữ: **Tiếng Việt** (`vi.json`) và **Tiếng Anh** (`en.json`)
- Chuyển đổi ngôn ngữ real-time không cần reload trang

---

## 6. Các Thay Đổi Chính (Sprint 2)

### Backend
- ✅ Thêm `common-lib`: chuẩn hóa `ApiResponse<T>` dùng chung
- ✅ Refactor `account-service`: sử dụng `ApiResponse` từ common-lib, loại bỏ code trùng lặp
- ✅ Xây dựng mới `baby-service`: CRUD thông tin em bé, tích hợp Kafka
- ✅ Xây dựng mới `task-service`: quản lý công việc với `TaskPendingCountResponse`
- ✅ Xây dựng mới `meal-service`: quản lý bữa ăn
- ✅ Xây dựng mới `expense-service`: quản lý chi tiêu
- ✅ Xây dựng mới `shopping-service`: danh sách mua sắm
- ✅ Xây dựng mới `insight-service`: báo cáo thống kê
- ✅ Xây dựng mới `file-service`: quản lý tệp tin với MinIO
- ✅ Xây dựng mới `notification-service`: xử lý thông báo qua Kafka
- ✅ Cập nhật cấu hình `api-gateway` và `authentication-service`

### Frontend
- ✅ Tích hợp i18n hoàn chỉnh cho tất cả module
- ✅ Hoàn thiện giao diện quản lý Baby (CRUD)
- ✅ Hoàn thiện giao diện quản lý Tasks (tạo, hoàn thành)
- ✅ Hoàn thiện giao diện Meals, Expenses, Shopping
- ✅ Cập nhật Dashboard và Insights
- ✅ Thêm `SuperAppCommandService` cho write operations
- ✅ Cập nhật API constants

### Infrastructure
- ✅ Cấu hình Docker Compose đầy đủ với: PostgreSQL, Redis, Kafka, Zookeeper, Kafka UI, Vault, MinIO
- ✅ Thêm Kafka topic initialization script
- ✅ Cấu hình Vault cho quản lý secret

---

## 7. Hướng Dẫn Chạy Dự Án

### Khởi động hạ tầng
```bash
cd codebase/infrastructure
docker-compose up -d
```

### Chạy từng backend service
```bash
cd codebase/backend/<service-name>
./mvnw spring-boot:run
```

### Chạy frontend
```bash
cd codebase/frontend
npm install
npm start
```
Frontend khởi động tại: http://localhost:4200

---

## 8. Quy Ước Code

### Backend
- **Kiến trúc:** Controller → Service → Repository (Spring Data JPA)
- **DTO pattern:** Record class cho request/response
- **Exception handling:** `RestExceptionHandler` tập trung
- **Response format:** `ApiResponse<T>` từ common-lib
- **Kafka events:** Package `event` trong từng service

### Frontend
- **Component pattern:** Standalone components
- **Data flow:** `BehaviorSubject` + `switchMap` cho reactive data
- **Form:** `ReactiveFormsModule` với validation
- **Styling:** Component-scoped CSS

---

## 9. Thông Tin Liên Hệ

| Mục | Giá trị |
|---|---|
| Repository | TruongKinn/BabySystem |
| Branch chính | main |
| Môi trường dev | localhost |
