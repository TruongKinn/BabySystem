# Hướng Dẫn Chạy & Vận Hành Hệ Thống BabySystem (MOM App)

Tài liệu này cung cấp hướng dẫn chi tiết, từng bước từ thiết lập môi trường, khởi động hạ tầng Docker, nạp cấu hình bảo mật, chạy các dịch vụ Backend Microservices cho đến vận hành Frontend Angular của dự án **BabySystem**.

---

## 1. Tổng Quan Kiến Trúc & Cổng Dịch Vụ

Hệ thống **BabySystem** được thiết kế theo kiến trúc **Microservices** hiện đại, giao tiếp qua REST API (định tuyến bởi Gateway) và các sự kiện bất đối xứng (qua Apache Kafka).

### Sơ đồ cổng (Port mapping) trên Localhost

| Dịch vụ / Hạ tầng | Cổng Local | Vai trò kỹ thuật |
| :--- | :--- | :--- |
| **API Gateway** | `4953` | Điểm tiếp nhận request duy nhất, định tuyến và kiểm tra quyền API |
| **Keycloak SSO** | `8080` | Quản lý định danh (Identity Provider), xác thực OAuth2/OIDC |
| **Keycloak Admin** | `8080/admin` | Trang quản trị tài khoản, quyền hạn và phân vai (Roles) |
| **Vault** | `8200` | Quản lý Secret, cấu hình nhạy cảm (JWT Key, DB Password) |
| **MinIO Console** | `9001` | Giao diện quản lý file, ảnh em bé lưu trữ trên Object Storage |
| **MinIO API** | `9000` | Endpoint API để File Service upload/download tài liệu |
| **Kafka UI** | `8085` | Giao diện theo dõi các Event Topics thời gian thực |
| **Kafka Broker** | `9092` | Message Broker chính xử lý truyền tải sự kiện |
| **PostgreSQL** | `5432` | Cơ sở dữ liệu quan hệ lưu trữ dữ liệu các phân hệ |
| **Redis** | `6379` | Cache tốc độ cao và quản lý phiên đăng nhập |
| **Debezium Connect** | `8094` | Lắng nghe CDC (Change Data Capture) từ CSDL cho Transactional Outbox |
| **Angular Frontend** | `4200` (hoặc `4201`) | Giao diện người dùng / Admin Portal |

---

## 2. Chuẩn Bị Môi Trường (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã được cài đặt sẵn:
1. **Docker & Docker Compose**: Để chạy toàn bộ cụm hạ tầng cơ sở dữ liệu và trung gian.
2. **Java JDK 17**: Cần thiết để biên dịch và chạy các Spring Boot Microservices.
3. **Node.js (Bản LTS - đề xuất v18 hoặc v20)** & **npm**: Để cài đặt thư viện và khởi động Angular Frontend.
4. **Git**: Để quản lý mã nguồn.

---

## 3. Bước 1: Khởi Động Hạ Tầng (Infrastructure Stack)

Toàn bộ cụm hạ tầng được cấu hình sẵn trong tập tin `docker-compose.yml` tại thư mục `codebase/infrastructure`.

1. Mở Terminal (PowerShell hoặc Bash) và di chuyển vào thư mục hạ tầng:
   ```bash
   cd codebase/infrastructure
   ```
2. Khởi động toàn bộ stack ở chế độ chạy ngầm (detached mode):
   ```bash
   docker-compose up -d
   ```
3. Kiểm tra xem các container đã khởi động thành công và khỏe mạnh chưa:
   ```bash
   docker ps
   ```
   *Bạn cũng có thể quản lý và theo dõi trực quan bằng **Docker Desktop**.*

---

## 4. Bước 2: Nạp Cấu Hình Bảo Mật (Bootstrap Infrastructure)

Sau khi cụm Docker khởi động hoàn toàn (đặc biệt là Vault và Keycloak), bạn cần chạy các kịch bản khởi tạo dữ liệu mẫu ban đầu.

### A. Nạp Secrets vào HashiCorp Vault
Vault đang chạy ở chế độ Development Mode với root token mặc định là `root`. Ta cần nạp các khóa cấu hình (như JWT Secret, Database credentials) vào Vault.

* **Trên Windows (PowerShell):**
  ```powershell
  cd codebase/infrastructure
  .\vault\bootstrap-secrets.ps1
  ```
* **Trên Linux / macOS (Bash):**
  ```bash
  cd codebase/infrastructure
  sh vault/bootstrap-secrets.sh
  ```

### B. Cấu Hình Keycloak SSO & Tài Khoản Demo
Hạ tầng Docker của Keycloak đã tự động import tệp tin cấu hình Realm `micro-services-realm.json`. Dưới đây là thông tin tài khoản mặc định bạn có thể sử dụng ngay:

* **Trang Quản Trị Keycloak Admin Console:** `http://localhost:8080/admin`
  * *Tài khoản:* `admin`
  * *Mật khẩu:* `admin`
* **Realm Sử Dụng:** `micro-services`
* **Client App:** `frontend-app`
* **Tài khoản Demo dành cho User Portal:**
  * *Tài khoản:* `demo.user`
  * *Mật khẩu:* `demo123`
* **Tài khoản Demo dành cho Admin Portal (Vận hành hệ thống):**
  * *Tài khoản:* `truongtv11` (Mật khẩu được lưu mặc định hoặc quản trị trong Keycloak console).

### C. Khởi Tạo Topics trong Kafka
Cấu hình Docker Compose có chứa dịch vụ `kafka-init` tự động khởi chạy một lần để tạo sẵn tất cả các topic sự kiện phục vụ cho nghiệp vụ như: `user.created`, `family.created`, `expense.created`, `baby.log.created`, `task.created`, v.v. Bạn có thể truy cập **Kafka UI** tại `http://localhost:8085` để giám sát các topics này.

---

## 5. Bước 3: Chạy Các Backend Microservices

Các dịch vụ Backend được viết bằng Spring Boot và quản lý qua Maven. Bạn có thể sử dụng Maven Wrapper (`mvnw` cho Linux/macOS hoặc `mvnw.cmd` cho Windows) đi kèm trong từng thư mục service mà không cần cài Maven thủ công.

### Thứ tự khởi động khuyến nghị
Để đảm bảo các service kết nối an toàn và định tuyến đúng, bạn nên chạy theo thứ tự sau:

1. **`api-gateway`** (Cổng vào, phân phối request).
2. **`authentication-service`** (Xử lý phân quyền API, exchange token).
3. **`account-service`** (Quản lý User, Gia đình).
4. **`baby-service`** (Quản lý bé, nhật ký hành trình).
5. **Các service nghiệp vụ khác chạy song song:** `task-service`, `meal-service`, `expense-service`, `shopping-service`, `insight-service`, `file-service`, `notification-service`.

### Lệnh chạy cụ thể cho từng Service

Mở một cửa sổ Terminal mới cho mỗi dịch vụ bạn muốn chạy:

```bash
# Di chuyển vào thư mục của service, ví dụ: baby-service
cd codebase/backend/baby-service

# Trên Windows (PowerShell/CMD):
.\mvnw.cmd spring-boot:run

# Trên Linux / macOS (Bash):
./mvnw spring-boot:run
```

> [!TIP]
> * **Cơ sở dữ liệu tự động di trú:** Mỗi khi Spring Boot khởi chạy, **Flyway** sẽ tự động so khớp và chạy các file SQL di trú (migrations) trong thư mục `src/main/resources/db/migration` để cập nhật cấu trúc bảng PostgreSQL tương ứng mà bạn không cần tạo bảng bằng tay.
> * **Logs lưu trữ:** Các service khi chạy thông qua các kịch bản chạy nền có thể xuất log trực tiếp vào thư mục `run-logs/` tại gốc dự án (ví dụ: `baby-service.out.log`, `baby-service.err.log`). Bạn có thể đọc các file này để phân tích lỗi.

---

## 6. Bước 4: Khởi Động Angular Frontend

Giao diện Frontend của ứng dụng nằm tại thư mục `codebase/frontend`.

1. Mở Terminal mới và đi vào thư mục frontend:
   ```bash
   cd codebase/frontend
   ```
2. Cài đặt các gói thư viện phụ thuộc (chỉ cần chạy lần đầu hoặc khi cấu hình gói thay đổi):
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển (Development Server):
   ```bash
   npm start
   ```
   *Mặc định, ứng dụng frontend sẽ biên dịch và lắng nghe tại địa chỉ: `http://localhost:4200`.*
4. Mở trình duyệt và truy cập `http://localhost:4200`. Hệ thống sẽ tự động chuyển hướng bạn đến màn hình đăng nhập của Keycloak SSO. Hãy đăng nhập bằng tài khoản `demo.user` / `demo123` (cho trải nghiệm gia đình) hoặc `truongtv11` (cho trải nghiệm quản trị hệ thống).

---

## 7. Các Công Cụ Giám Sát & Vận Hành Hữu Ích

Khi hệ thống đang hoạt động, bạn có thể giám sát trạng thái thông qua các bảng điều khiển trực quan sau:

### A. Quản Lý File Đính Kèm (MinIO Object Storage)
* **URL Console:** `http://localhost:9001`
* **Tài khoản:** `minioadmin` / **Mật khẩu:** `minioadmin`
* **Chức năng:** Nơi lưu trữ ảnh em bé, file đính kèm, các tài liệu Excel xuất bản. Các tệp tin được phân vùng tự động trong các bucket chuyên biệt.

### B. Giám Sát Sự Kiện (Kafka UI)
* **URL:** `http://localhost:8085`
* **Chức năng:** Cho phép theo dõi số lượng tin nhắn (Messages), phân tích payload sự kiện gửi đi giữa các microservices và quản lý Consumer Groups để biết dịch vụ nào đang bị nghẽn (lag).

### C. Quản Lý Secrets (HashiCorp Vault)
* **URL:** `http://localhost:8200`
* **Đăng nhập bằng:** Token `root`
* **Chức năng:** Xem trực tiếp cấu hình key-value được mã hóa bảo mật cung cấp cho các Spring Boot microservices lúc khởi chạy.

---

## 8. Hướng Dẫn Xử Lý Các Sự Cố Thường Gặp (Troubleshooting)

### 1. Gặp lỗi `403 Forbidden` khi gọi API mới tạo
* **Nguyên nhân:** Do API mới tạo ở Backend chưa được khai báo quyền hạn trong hệ thống phân quyền (Permission Gate).
* **Cách khắc phục:**
  1. Kiểm tra xem API của bạn có đi qua API Gateway định tuyến không.
  2. Bắt buộc thêm các script SQL di trú định nghĩa Permission và gán cho Role tương ứng tại thư mục `codebase/backend/authentication-service/src/main/resources/db/migration/` (Ví dụ: Chèn bản ghi vào `tbl_permission` và `tbl_role_has_permission`).
  3. Khởi động lại **Authentication Service** để hệ thống nạp lại danh sách phân quyền.

### 2. Gặp lỗi `400 Bad Request` khi gửi dữ liệu Ngày tháng / Ngày sinh
* **Nguyên nhân:** Kiểu dữ liệu phía backend sử dụng `OffsetDateTime` nhưng client gửi chuỗi ngày giờ cục bộ thiếu múi giờ (Ví dụ: gửi `2026-05-18T08:00:00` thay vì `2026-05-18T08:00:00Z` hoặc `2026-05-18T08:00:00+07:00`).
* **Cách khắc phục:**
  * Luôn đảm bảo phía Client (Frontend Angular) sử dụng hàm xử lý ngày tháng chuyên biệt (như `this.resolveDate(value)?.toISOString()`) để sinh ra chuỗi định dạng ISO 8601 chuẩn UTC có chứa ký tự chỉ thị múi giờ `Z` trước khi gửi request.

### 3. Không thể đăng nhập, bị kẹt ở màn hình Keycloak
* **Nguyên nhân:** Do cụm Docker Keycloak chưa khởi động xong hoặc cấu hình cổng cục bộ bị xung đột.
* **Cách khắc phục:**
  1. Truy cập thử `http://localhost:8080/realms/micro-services/.well-known/openid-configuration` bằng trình duyệt hoặc `curl`. Nếu trả về JSON cấu hình là Keycloak hoạt động bình thường.
  2. Đảm bảo cổng `8080` không bị chiếm dụng bởi các ứng dụng khác trên máy tính của bạn trước khi chạy Docker Compose.

---

## 9. Vận Hành Tính Năng Tiêm Chủng & Quét Sổ Tiêm AI (OCR)

Phân hệ quản lý tiêm chủng cung cấp các công cụ theo dõi lộ trình tiêm cho bé, nhắc lịch tự động qua Kafka, quản lý danh mục vắc-xin cho Admin và quét ảnh sổ tiêm giấy bằng AI Gemini OCR.

### A. Thiết lập & Luồng Nghiệp vụ
1. **Quản lý Danh mục (Admin Portal):**
   * Admin hệ thống truy cập `/admin/vaccines` để quản lý danh mục vắc-xin (`POST /api/vaccines`) và cấu hình các lộ trình tiêm chuẩn (`POST /api/vaccines/{vaccineId}/schedule-configs`).
   * Các cấu hình lộ trình bao gồm: số mũi tiêm bắt buộc, tuổi tiêm khuyến nghị (tháng tuổi) và khoảng cách tối thiểu giữa các mũi tiêm.
2. **Theo dõi lịch tiêm (User Portal):**
   * Khi thêm mới hồ sơ bé, hệ thống tự động sinh lộ trình tiêm chủng mẫu dựa trên ngày sinh của bé.
   * Người dùng xem lộ trình dưới dạng Bento Layout tại màn hình Baby, thực hiện **Đã tiêm** hoặc **Hoãn tiêm** thủ công.
3. **Quét sổ tiêm bằng AI (OCR):**
   * Người dùng tải ảnh chụp sổ tiêm chủng giấy lên. Hệ thống tải tệp tin lên `file-service` nhận về `fileId`.
   * Gửi request `POST /api/babies/{id}/vaccinations/scan` kèm `fileId` sang `baby-service`.
   * `baby-service` forward yêu cầu sang `ai-service` (`POST /api/copilot/ocr-vaccinations`) để phân tích bằng mô hình Gemini AI, trích xuất danh sách các mũi tiêm (tên vắc-xin, mũi số mấy, ngày tiêm).
   * Hệ thống tự động so khớp tên vắc-xin, lọc trùng lặp và tự động import các mũi tiêm thành công vào cơ sở dữ liệu của bé.
4. **Nhắc lịch tự động (Daily Scheduler):**
   * Hằng ngày vào lúc **07:00 sáng**, một tác vụ lập lịch (`VaccinationScheduler`) tự động quét các mũi tiêm chưa hoàn thành đến hạn trong vòng 1 ngày tới.
   * Tạo payload nhắc nhở và gửi qua Kafka topic `vaccination-reminder-topic`.
   * `notification-service` lắng nghe topic này, tự động phân phối thông báo nhắc nhở song song qua hai kênh: **Web Push** (đẩy lên trình duyệt qua WebSocket/SSE) và **Email** cho gia đình.

### B. Chạy Kiểm Thử Tiêm Chủng
Để chạy toàn bộ các Unit Test và Integration Test của tính năng tiêm chủng tại backend `baby-service`, thực hiện lệnh sau trong thư mục `codebase/backend/baby-service`:
```powershell
# Chạy trên Windows PowerShell:
.\mvnw.cmd test -Dtest="VaccinationEventPublisherTest,VaccinationOcrServiceTest,BabyVaccinationIntegrationTest"

# Chạy trên Linux / macOS Bash:
./mvnw test -Dtest="VaccinationEventPublisherTest,VaccinationOcrServiceTest,BabyVaccinationIntegrationTest"
```

---
*Tài liệu này được biên soạn nhằm giúp các nhà phát triển nhanh chóng làm quen và kiểm soát toàn diện quy trình vận hành của dự án **BabySystem**.*
