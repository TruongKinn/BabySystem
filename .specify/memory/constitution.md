<!--
SYNC IMPACT REPORT
- Version change: 0.0.0 → 1.0.0
- List of modified principles: None (Initial version)
- Added sections: Core Principles, Technology Stack & Integration Standards, Development Workflow & Quality Gates, Governance
- Removed sections: None
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
- Follow-up TODOs: None
-->
# BabySystem Constitution

## Core Principles

### I. Database-per-Service Isolation
Mỗi microservice trong hệ thống BabySystem MUST sở hữu và quản lý một cơ sở dữ liệu hoàn toàn độc lập (Database-per-Service). Tuyệt đối KHÔNG chia sẻ cơ sở dữ liệu giữa các dịch vụ. Mọi giao tiếp và chia sẻ dữ liệu liên dịch vụ bắt buộc phải thực hiện thông qua REST API hoặc truyền nhận tin nhắn bất đồng bộ qua Kafka Event Broker.

### II. Event-Driven Consistency & Transactional Outbox
Để đảm bảo tính nhất quán dữ liệu trong môi trường phân tán mà không làm giảm hiệu năng hệ thống, cơ chế ghi đồng thời (Dual-Write) vào database nghiệp vụ và gửi message trực tiếp lên Kafka bị CẤM. Tất cả các sự kiện thay đổi dữ liệu bắt buộc phải được ghi vào bảng Outbox (`outbox_events`) trong cùng một transaction nghiệp vụ, sau đó sử dụng Debezium CDC quét WAL để đẩy sự kiện lên Kafka. Quy trình giao dịch phức tạp liên dịch vụ phải tuân thủ Choreography-based Saga Pattern kết hợp Compensating Transaction để khôi phục trạng thái khi có lỗi.

### III. Centralized Identity & Security Management
Bảo mật là yếu tố tối quan trọng. Hệ thống bắt buộc sử dụng Keycloak làm giải pháp quản lý danh tính tập trung (SSO/IAM) và phân quyền Role-Based Access Control (RBAC). Tất cả thông tin nhạy cảm bao gồm DB credentials, API Keys của OpenAI/Gemini, JWT Secrets MUST được lưu trữ tại HashiCorp Vault và nạp trực tiếp vào RAM lúc khởi động thông qua bootstrap, tuyệt đối KHÔNG lưu cứng (hardcode) bất kỳ secrets nào trong codebase.

### IV. Premium Glassmorphism & Bento Layout UI/UX
Giao diện Angular Standalone SPA của BabySystem phải mang lại trải nghiệm WOW cho người dùng ngay từ cái nhìn đầu tiên. Mọi màn hình mới/cập nhật MUST tuân thủ phong cách Bento Layout và hiệu ứng Glassmorphism (backdrop blur, border mờ tinh tế, bóng đổ mềm mại). Mọi tương tác giao diện (interactive elements) bắt buộc phải có hiệu ứng chuyển động vi mô (micro-animations) mượt mà và hỗ trợ đầy đủ thiết kế đáp ứng (Responsive Design) từ Mobile 375px đến Desktop rộng.

### V. Strict i18n Compliance
Dự án hỗ trợ đa ngôn ngữ hoàn toàn và nghiêm ngặt. Khi thêm mới hoặc cập nhật văn bản hiển thị trên bất kỳ màn hình nào, nhà phát triển BẮT BUỘC phải cung cấp đầy đủ file dịch cho cả 4 ngôn ngữ: Tiếng Việt (`vi.json`), Tiếng Anh (`en.json`), Tiếng Trung (`zh.json`), và Tiếng Nhật (`ja.json`) trong thư mục route tương ứng. Đồng thời phải chạy script compile-i18n sau khi cập nhật để đồng bộ dữ liệu.

## Technology Stack & Integration Standards
Hệ thống được phát triển trên bộ công nghệ tiêu chuẩn sau:
- **Backend**: Spring Boot 3.x, Spring Cloud Gateway, JPA/Hibernate.
- **Frontend**: Angular 17 (Standalone Components, RxJS Reactive Streams, ngx-translate).
- **Hạ tầng**: PostgreSQL, Apache Kafka & Debezium Connect, Keycloak OIDC, HashiCorp Vault, Redis, MinIO S3 Storage.
- **Vận hành**: Quản lý hạ tầng cục bộ qua Docker Compose.

## Development Workflow & Quality Gates
Quy trình phát triển và kiểm soát chất lượng của BabySystem bao gồm các chốt chặn sau:
1. **API Permission Gate**: Khi tạo endpoint mới trong các Spring Controller, bắt buộc khai báo API permission trong DB migration script (`tbl_permission`) tại authentication-service.
2. **Translation Verification**: Sau khi thay đổi code dịch i18n, bắt buộc chạy lệnh `node codebase/scripts/compile-i18n.js` để biên dịch trước khi commit.
3. **Idempotent Check**: Khi xây dựng Consumer tiêu thụ Kafka event, bắt buộc ghi nhận ID sự kiện vào bảng `processed_events` để đảm bảo tính Idempotency, tránh xử lý lặp.

## Governance
Hiến pháp này là bộ quy tắc tối cao cho việc phát triển BabySystem. Mọi thay đổi, bổ sung đối với Hiến pháp phải được đề xuất chính thức và cập nhật phiên bản theo quy tắc SemVer:
- Tăng **MAJOR** version khi có thay đổi mang tính phá vỡ cấu trúc nguyên tắc.
- Tăng **MINOR** version khi thêm mới hoặc mở rộng các nguyên tắc/tiêu chuẩn.
- Tăng **PATCH** version khi sửa lỗi diễn đạt hoặc typo mà không thay đổi ý nghĩa quy tắc.

**Version**: 1.0.0 | **Ratified**: 2026-07-26 | **Last Amended**: 2026-07-26
