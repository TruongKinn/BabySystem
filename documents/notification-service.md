# Tài liệu dịch vụ: Hướng dẫn xử lý lỗi kết nối Vault 403 Forbidden cho Notification Service

Tài liệu này ghi nhận sự cố lỗi phân quyền HashiCorp Vault (`Status 403 Forbidden`) đối với dịch vụ `notification-service` và giải pháp khắc phục.

## Sự cố

Khi chạy `notification-service` ở môi trường local, ứng dụng bị lỗi startup:
```
org.springframework.vault.VaultException: Status 403 Forbidden [secret/notification-service]: permission denied
	at org.springframework.vault.client.VaultResponses.buildException(VaultResponses.java:84)
```

## Nguyên nhân

1. Dịch vụ được tích hợp với Spring Cloud Vault để đọc các config từ Vault Server đang chạy tại `http://localhost:8200`.
2. Theo cấu hình mặc định trong `application.yml`:
   ```yaml
   spring:
     cloud:
       vault:
         token: ${VAULT_TOKEN:root}
   ```
   Nếu không chỉ định biến môi trường `VAULT_TOKEN`, Spring Boot sẽ lấy giá trị mặc định là `root`.
3. Tuy nhiên, Vault Server được khởi tạo tự động qua script bootstrap đã tạo ra một token ngẫu nhiên thay vì sử dụng token `root`. Token thực tế được lưu tại:
   `codebase/infrastructure/vault/cluster-keys.json`
   Trong trường `"root_token"`.
4. Việc sử dụng token mặc định `root` để kết nối vào Vault dẫn đến lỗi `403 Forbidden`.

## Giải pháp khắc phục

Để bảo mật tuyệt đối cho dự án (tránh rò rỉ secret lên Git khiến GitHub Push Protection chặn push), chúng ta **không** hardcode token thực tế vào tệp cấu hình `application.yml`. Thay vào đó, áp dụng các phương pháp an toàn dưới đây:

### Cách 1: Sử dụng Script tự động khởi chạy (Khuyên dùng)
Tôi đã tạo sẵn một script PowerShell tại thư mục gốc của dự án:
👉 `run-notification-service.ps1`

Script này sẽ tự động đọc token ngẫu nhiên từ file `cluster-keys.json` và truyền vào biến môi trường hệ thống trước khi start `notification-service`. Bạn chỉ cần mở PowerShell và chạy:
```powershell
./run-notification-service.ps1
```

### Cách 2: Thiết lập Biến Môi trường thủ công
Nếu muốn chạy trực tiếp từ Terminal hoặc cấu hình biến môi trường trong IDE (IntelliJ, Eclipse), hãy lấy Token thực tế từ tệp `codebase/infrastructure/vault/cluster-keys.json` (giá trị của `"root_token"`).

- **Trong PowerShell**:
  ```powershell
  $env:VAULT_TOKEN="<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>"
  mvn spring-boot:run
  ```
- **Trong CMD**:
  ```cmd
  set VAULT_TOKEN=<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>
  mvn spring-boot:run
  ```
- **Trong Linux/Bash**:
  ```bash
  export VAULT_TOKEN=<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>
  mvn spring-boot:run
  ```
- **Trong IntelliJ IDEA**:
  Mở cấu hình Run/Debug của dịch vụ, thêm biến môi trường (Environment Variables):
  `VAULT_TOKEN=<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>`
