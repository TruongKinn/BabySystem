# Implementation Plan: Baby Vaccination Tracker

**Branch**: `baby-service-vaccination` | **Date**: 2026-07-26 | **Spec**: [spec.md](file:///d:/AI-AGENT/BabySystem/documents/baby-service-vaccination/spec.md)

**Input**: Feature specification from `documents/baby-service-vaccination/spec.md`

## Summary

Tính năng **Baby Vaccination Tracker** giúp cha mẹ số hóa sổ tiêm chủng của con, tự động hiển thị lộ trình tiêm chủng khuyến nghị theo chuẩn Bộ Y tế từ lúc sơ sinh đến 5 tuổi, dời lịch tiêm thông minh khi bị hoãn mũi tiêm, tự động nhắc lịch tiêm qua Web Push/Email trước 3 ngày hằng ngày, và sử dụng AI OCR để quét nhanh sổ tiêm giấy.

**Hướng tiếp cận kỹ thuật**:
- **Backend (`baby-service`)**: Thiết kế cơ sở dữ liệu mở rộng với danh mục vắc-xin (`vaccines`) và cấu hình lộ trình tiêm chủng (`vaccine_schedule_configs`). Mở rộng thực thể lịch sử tiêm (`vaccinations`) để liên kết và theo dõi trạng thái. Sử dụng Flyway để migration database `baby_db`.
- **Scheduler & Kafka**: Lập lịch Scheduler chạy lúc 07:00 sáng hằng ngày để quét lịch tiêm, gửi sự kiện nhắc nhở sang Kafka topic `vaccination-reminder-topic` nhằm kích hoạt `notification-service` gửi thông báo Web Push & Email.
- **Bảo mật & Phân quyền**: Áp dụng `DataIsolationUtil` để cô lập dữ liệu tiêm chủng của trẻ em theo Family ID. Khai báo API Permission SQL migration tại `authentication-service` để kích hoạt API Permission Gate.
- **Frontend**: Xây dựng giao diện Angular 17 Standalone hiển thị biểu đồ lộ trình dạng Bento Layout, tích hợp hiệu ứng Glassmorphism và đa ngôn ngữ (vi, en, zh, ja).

---

## Technical Context

**Language/Version**: Java 17 (Backend), TypeScript 5.4 / Angular 17 (Frontend)

**Primary Dependencies**: Spring Boot Starter Data JPA, Flyway Migration, Spring Kafka, Redis Cache, Spring Boot Starter Validation, Angular Standalone (ngx-translate).

**Storage**: PostgreSQL (Database `baby_db` cho `baby-service`, `auth_db` cho `authentication-service` để phân quyền).

**Testing**: JUnit 5, Mockito, Spring Boot Starter Test (kiểm thử REST endpoints và Scheduler).

**Target Platform**: Docker Compose local deployment.

**Project Type**: Microservices Web Service (Spring Boot) + Angular Single Page Application.

**Performance Goals**: API response time < 200ms p95, thời gian tải trang UI tiêm chủng < 1.5 giây.

**Constraints**: Tuân thủ nghiêm ngặt Database-per-Service, cô lập dữ liệu theo Family ID, API Permission Gate, và đa ngôn ngữ 4 thứ tiếng.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc hiến pháp | Trạng thái | Giải thích sự tuân thủ |
| :--- | :--- | :--- |
| **I. Database-per-Service Isolation** | **PASSED** | Toàn bộ các thực thể dữ liệu mới (`VaccineEntity`, `VaccineScheduleConfigEntity`, `VaccinationEntity`) đều nằm hoàn toàn trong DB `baby_db` của `baby-service`. |
| **II. Event-Driven & Outbox Pattern** | **PASSED** | Gửi thông điệp nhắc lịch tiêm thông qua Kafka topic `vaccination-reminder-topic`. Tác vụ nhắc lịch là Scheduler chỉ đọc dữ liệu và gửi thông báo nên không phát sinh Dual-Write. Các API cập nhật mũi tiêm nếu có tích hợp gửi thông báo realtime sẽ sử dụng Outbox Pattern. |
| **III. Centralized Identity & Security** | **PASSED** | Sử dụng Keycloak JWT để xác thực. Sử dụng `DataIsolationUtil.validateFamilyAccess` để cô lập dữ liệu theo Family ID. |
| **IV. Bento Layout & Glassmorphism UI** | **PASSED** | Màn hình theo dõi tiêm chủng của bé ở Frontend Angular được thiết kế theo phong cách Bento Layout và hiệu ứng Glassmorphism hiện đại. |
| **V. Strict i18n Compliance** | **PASSED** | Bắt buộc định nghĩa đầy đủ nhãn dịch i18n trong 4 file ngôn ngữ `vi.json`, `en.json`, `zh.json`, `ja.json` cho route `/app/babies/vaccination` và chạy script compile-i18n. |
| **VI. API Permission Gate** | **PASSED** | Khi tạo mới endpoints cho Admin và User, bắt buộc viết migration script bổ sung bản ghi vào bảng `tbl_permission` và `tbl_role_has_permission` tại `authentication-service`. |

---

## Project Structure

### Documentation (this feature)

```text
documents/baby-service-vaccination/
├── plan.md              # Kế hoạch thực thi (Tập tin này)
├── research.md          # Kết quả nghiên cứu Phase 0 (Các phương án kỹ thuật và rủi ro)
├── data-model.md        # Thiết kế database và State Machine Phase 1
├── quickstart.md        # Hướng dẫn chạy thử và xác minh Phase 1
└── checklists/
    └── requirements.md  # Checklist đánh giá chất lượng đặc tả
```

### Source Code changes

```text
codebase/
├── backend/
│   ├── authentication-service/
│   │   └── src/main/resources/db/migration/    # Migration SQL cấp quyền API mới
│   ├── baby-service/
│   │   ├── src/main/java/com/mom/baby/
│   │   │   ├── domain/                         # Thêm VaccineEntity, VaccineScheduleConfigEntity, cập nhật VaccinationEntity
│   │   │   ├── repository/                     # Thêm VaccineRepository, VaccineScheduleConfigRepository
│   │   │   ├── service/                        # Thêm VaccineService, cập nhật BabyService, Scheduler quét lịch tiêm
│   │   │   └── controller/                     # Thêm VaccineController, cập nhật BabyController (hoặc các endpoints tiêm chủng mới)
│   │   └── src/main/resources/db/migration/    # Migration SQL Flyway cập nhật DB schema cho baby_db
├── frontend/
│   └── src/app/
│       ├── pages/babies/vaccination/           # UI và Components theo Bento Layout
│       └── assets/i18n/app/babies/vaccination/ # File i18n (vi.json, en.json, zh.json, ja.json)
```

**Structure Decision**: Cấu trúc phân tách rõ ràng Backend Microservices và Frontend Single Page Application, đảm bảo tính mô-đun hóa và dễ kiểm thử.

---

## Complexity Tracking

*Không có vi phạm hiến pháp nào cần giải trình.*
