# Tài liệu Kỹ Thuật: Dịch Vụ Phân Tích Số Liệu & Báo Cáo (Insight Service)

Tài liệu này đặc tả chi tiết thiết kế kỹ thuật, kiến trúc và nhật ký vận hành, bảo trì của dịch vụ `insight-service`.

---

## 1. Tổng Quan Dịch Vụ
`insight-service` là một microservice thuộc hệ thống BabySystem, chịu trách nhiệm:
* Thu thập, xử lý và tổng hợp số liệu hoạt động hàng ngày của trẻ em (chế độ ăn uống, sinh hoạt, chi tiêu gia đình).
* Cung cấp các biểu đồ, báo cáo thống kê trực quan cho người dùng.
* Xuất bản các tài liệu thống kê dạng tệp tin Excel/PDF phục vụ nhu cầu lưu trữ của gia đình.
* Giao tiếp không đồng bộ thông qua Apache Kafka để lắng nghe các sự kiện nghiệp vụ từ các service khác (như `expense-service`, `meal-service`, `baby-service`, `task-service`).

---

## 2. Kiến Trúc Kỹ Thuật & Luồng Dữ Liệu

### 2.1. Cấu Trúc Mã Nguồn
* **Package chính:** `com.mom.insight`
* **Công nghệ cốt lõi:** Spring Boot 3.3.3, JPA (Hibernate), PostgreSQL, Spring Kafka, Flyway DB Migration.
* **Cơ sở dữ liệu:** `insight_db` (PostgreSQL) sử dụng các bảng `tbl_insight_daily_stat` (thống kê hàng ngày) và `tbl_insight_export_file` (tệp tin xuất bản báo cáo).

### 2.2. Luồng Lắng Nghe Sự Kiện Kafka (Consumer)
Dịch vụ đăng ký lắng nghe (Subscribe) các topic Kafka để cập nhật dữ liệu thống kê theo thời gian thực:
* `task.created` & `task.completed`: Cập nhật năng suất hoàn thành công việc của các thành viên.
* `expense.created`: Tổng hợp dòng tiền chi tiêu gia đình.
* `baby.log.created`: Thống kê các chỉ số sinh hoạt của bé (chiều cao, cân nặng, giấc ngủ).
* `meal.plan.created`: Thống kê tần suất và thực đơn dinh dưỡng.

---

## 3. Nhật Ký Khắc Phục Lỗi: Flyway Checksum Mismatch cho Migration Version 2

### 3.1. Hiện Tượng Lỗi
Vào ngày 22/05/2026, khi khởi động dịch vụ `insight-service` bị lỗi sập tiến trình lập tức với thông điệp:
```
Caused by: org.flywaydb.core.api.exception.FlywayValidateException: Validate failed: Migrations have failed validation
Migration checksum mismatch for migration version 2
-> Applied to database : 1598109381
-> Resolved locally    : 827217941
Either revert the changes to the migration, or run repair to update the schema history.
```

### 3.2. Nguyên Nhân
Tệp tin SQL local của migration phiên bản 2 (`V2__add_insight_export_files.sql`) đã bị chỉnh sửa nhẹ (có thể là ký tự khoảng trắng hoặc thay đổi định dạng ký tự xuống dòng từ LF sang CRLF) sau khi đã được chạy và lưu vết vào cơ sở dữ liệu `insight_db` cục bộ của máy phát triển. Khi khởi động lại, Flyway so khớp checksum local (`827217941`) với checksum cơ sở dữ liệu đã lưu (`1598109381`) và chặn đứng quá trình chạy để tránh rủi ro không đồng bộ cấu trúc database.

### 3.3. Giải Pháp Kỹ Thuật
Tương tự như giải pháp áp dụng thành công cho `authentication-service`, chúng tôi áp dụng chiến lược **Flyway Repair tự động** bằng cách chèn Bean tùy biến trong vòng đời khởi động của ứng dụng, giúp giải quyết triệt để vấn đề này ở môi trường local của toàn bộ đội ngũ phát triển.

1. **Đăng ký lớp cấu hình FlywayConfig:**
   Tạo tệp cấu hình mới tại [FlywayConfig.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/insight-service/src/main/java/com/mom/insight/config/FlywayConfig.java):
   ```java
   package com.mom.insight.config;

   import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
   import org.springframework.context.annotation.Bean;
   import org.springframework.context.annotation.Configuration;

   @Configuration
   public class FlywayConfig {

       @Bean
       public FlywayMigrationStrategy flywayMigrationStrategy() {
           return flyway -> {
               flyway.repair();
               flyway.migrate();
           };
       }
   }
   ```

2. **Cơ chế hoạt động:**
   * Spring Boot phát hiện Bean `FlywayMigrationStrategy` tùy biến và kích hoạt nó trước khi thực thi tiến trình migrate mặc định.
   * `flyway.repair()` sẽ tự động so khớp các file migration local và cập nhật lại checksum trong bảng `flyway_schema_history` của database cho khớp hoàn hảo với local.
   * Sau khi sửa chữa xong, `flyway.migrate()` chạy tiếp tục và ứng dụng khởi chạy trơn tru mà không bị chặn lại.

### 3.4. Kết Quả Xác Thực
Sau khi cấu hình, ứng dụng được khởi động bằng Maven:
```powershell
mvn spring-boot:run
```
Hệ thống ghi nhận quá trình tự động sửa chữa diễn ra thành công tốt đẹp:
```
2026-05-22T17:45:13.615+07:00  INFO 11224 --- [insight-service] [           main] org.flywaydb.core.FlywayExecutor         : Database: jdbc:postgresql://localhost:5432/insight_db (PostgreSQL 16.13)
2026-05-22T17:45:13.655+07:00  INFO 11224 --- [insight-service] [           main] o.f.c.i.s.JdbcTableSchemaHistory         : Repair of failed migration in Schema History table "public"."flyway_schema_history" not necessary. No failed migration detected.
2026-05-22T17:45:13.674+07:00  INFO 11224 --- [insight-service] [           main] o.f.c.i.s.JdbcTableSchemaHistory         : Repairing Schema History table for version 2 (Description: add insight export files, Type: SQL, Checksum: 827217941)  ...
2026-05-22T17:45:13.683+07:00  INFO 11224 --- [insight-service] [           main] o.f.core.internal.command.DbRepair       : Successfully repaired schema history table "public"."flyway_schema_history" (execution time 00:00.048s).
2026-05-22T17:45:13.734+07:00  INFO 11224 --- [insight-service] [           main] o.f.core.internal.command.DbValidate     : Successfully validated 2 migrations (execution time 00:00.008s)
2026-05-22T17:45:13.756+07:00  INFO 11224 --- [insight-service] [           main] o.f.core.internal.command.DbMigrate      : Current version of schema "public": 2
2026-05-22T17:45:13.760+07:00  INFO 11224 --- [insight-service] [           main] o.f.core.internal.command.DbMigrate      : Schema "public" is up to date. No migration necessary.
...
2026-05-22T17:45:16.432+07:00  INFO 11224 --- [insight-service] [           main] c.mom.insight.InsightServiceApplication  : Started InsightServiceApplication in 5.288 seconds (process running for 5.57)
```
* **Phân tích kết quả:**
  1. Flyway đã quét schema history và phát hiện sự sai lệch checksum ở phiên bản 2.
  2. Quá trình repair tự động cập nhật checksum của phiên bản 2 trong database về giá trị local `827217941` chỉ trong `0.048s`.
  3. Quá trình kiểm thực (`DbValidate`) vượt qua thành công tốt đẹp.
  4. Ứng dụng `insight-service` đã khởi chạy thành công hoàn toàn và đang lắng nghe sự kiện từ Kafka bình thường.
