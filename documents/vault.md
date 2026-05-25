# HashiCorp Vault - Hướng Dẫn Vận Hành & Cấu Hình Chuẩn Production

Tài liệu này cung cấp hướng dẫn vận hành, quản trị và cấu hình chi tiết cho hệ thống lưu trữ mật HashiCorp Vault trong dự án **BabySystem** theo tiêu chuẩn Production.

---

## 1. Kiến Trúc Vault Chuẩn Production

Khác với chế độ Development (`-dev`) vốn lưu trữ dữ liệu hoàn toàn trên bộ nhớ RAM tạm thời và sử dụng Token Root mặc định cố định, chế độ **Production** của Vault hoạt động với các tiêu chí bảo mật nghiêm ngặt:
*   **Persistent Storage (Lưu trữ bền vững):** Dữ liệu được mã hóa và lưu trữ lâu dài thông qua cơ chế đồng thuận Raft tích hợp sẵn.
*   **Stateful Initialization & Unseal:** Mỗi khi khởi động, Vault sẽ ở trạng thái khóa (Sealed). Cần tối thiểu một số lượng khóa nhất định (Threshold) để mở khóa (Unseal) và đưa hệ thống vào hoạt động.
*   **Memory Swapping Protection (mlock):** Ngăn chặn hệ điều hành ghi các vùng bộ nhớ nhạy cảm chứa khóa bí mật của Vault ra ổ đĩa swap dưới dạng plain-text.

---

## 2. Phân Tích Cấu Hình Hệ Thống

### 2.1. Cấu hình Docker Compose (`docker-compose.yml`)
Trong môi trường Production, Vault được định nghĩa như sau:

```yaml
  vault:
    image: hashicorp/vault:1.16
    container_name: mom-vault
    restart: unless-stopped
    cap_add:
      - IPC_LOCK
    ports:
      - "8200:8200"
    environment:
      VAULT_ADDR: 'http://127.0.0.1:8200'
      VAULT_API_ADDR: 'http://127.0.0.1:8200'
    command: vault server -config=/vault/config/vault.hcl
    volumes:
      - ./vault/config:/vault/config:ro
      - vault_data:/vault/data
      - vault_logs:/vault/logs
```

*   `cap_add: [IPC_LOCK]`: Cấp quyền hệ thống cho container thực hiện khóa bộ nhớ (`mlock`), ngăn hệ điều hành swap dữ liệu nhạy cảm ra ổ đĩa cứng.
*   `vault server -config=...`: Chạy Vault dưới dạng server thực tế thay vì chế độ dev.
*   Mount volume `:ro` (Read-only) cho thư mục cấu hình `/vault/config` để đảm bảo file cấu hình không bị sửa đổi ngoài ý muốn từ bên trong container.

### 2.2. Chi tiết cấu hình Vault (`vault.hcl`)
Tệp tin [vault.hcl](file:///d:/AI-AGENT/BabySystem/codebase/infrastructure/vault/config/vault.hcl) quy định hành vi của Vault:

```hcl
# Kích hoạt giao diện Web UI
ui = true

# Sử dụng công cụ đồng thuận Raft làm storage backend
storage "raft" {
  path    = "/vault/data"
  node_id = "mom-vault-node-1"
}

# Cấu hình Listener lắng nghe các yêu cầu kết nối
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = "true" # TLS được offload tại Load Balancer hoặc API Gateway bên ngoài
}

# Địa chỉ API công khai và Cluster cho các Node Raft giao tiếp
api_addr     = "http://127.0.0.1:8200"
cluster_addr = "http://127.0.0.1:8201"

# Bật tính năng khóa bộ nhớ ngăn swap ra ổ đĩa
disable_mlock = false
```

---

## 3. Quy Trình Vận Hành (Operations Guide)

### 3.1. Khởi tạo hệ thống (Initialization)
Khi lần đầu chạy Vault ở chế độ Production, hệ thống trống hoàn toàn và chưa được cấu hình khóa. Để khởi tạo:

```bash
docker exec -it mom-vault vault operator init
```
Hoặc khởi tạo xuất ra định dạng JSON:
```bash
docker exec -it mom-vault vault operator init -format=json
```

**Kết quả đầu ra quan trọng:**
*   **5 Unseal Keys (Khóa giải mã):** Dùng để mở khóa Vault.
*   **1 Initial Root Token (Token gốc):** Quyền tối cao quản trị Vault (chỉ dùng để cấu hình ban đầu, sau đó phải thu hồi hoặc cất giữ an toàn).

> [!CAUTION]
> Phải cất giữ 5 Unseal Keys và Root Token ở các nơi an toàn và độc lập nhau. Mất các khóa này đồng nghĩa với việc mất toàn bộ dữ liệu mật trong Vault vĩnh viễn không thể khôi phục.

### 3.2. Giải mã hệ thống (Unseal Process)
Mỗi khi container Vault khởi động lại, Vault sẽ ở trạng thái **Sealed** (Đóng băng và mã hóa dữ liệu). Để mở khóa, bạn cần nhập tối thiểu **3 trong số 5** khóa giải mã (Threshold = 3):

```bash
docker exec -it mom-vault vault operator unseal <unseal_key_1>
docker exec -it mom-vault vault operator unseal <unseal_key_2>
docker exec -it mom-vault vault operator unseal <unseal_key_3>
```

Bạn có thể kiểm tra trạng thái khóa bằng lệnh:
```bash
docker exec -it mom-vault vault status
```
*   `Sealed: true` -> Đang khóa.
*   `Sealed: false` -> Đã mở khóa, sẵn sàng hoạt động.

---

## 4. Tự Động Hóa Với Scripts Bootstrap cục bộ

Để tạo sự thuận tiện tối đa cho các nhà phát triển ở môi trường cục bộ (Local Development), dự án cung cấp 2 kịch bản tự động hóa hoàn toàn quy trình Khởi tạo, Giải mã và Nạp Secrets:
*   **Dành cho Linux/MacOS:** [bootstrap-secrets.sh](file:///d:/AI-AGENT/BabySystem/codebase/infrastructure/vault/bootstrap-secrets.sh)
*   **Dành cho Windows:** [bootstrap-secrets.ps1](file:///d:/AI-AGENT/BabySystem/codebase/infrastructure/vault/bootstrap-secrets.ps1)

### Cách thức hoạt động của Script:
1.  Kiểm tra xem Vault đã được khởi tạo chưa. Nếu chưa, tự động chạy lệnh khởi tạo và ghi các khóa Unseal + Root Token vào tệp tin bảo mật cục bộ `codebase/infrastructure/vault/cluster-keys.json`.
2.  Tệp `cluster-keys.json` được đưa vào `.gitignore` để ngăn chặn đẩy lên Git repository.
3.  Nếu Vault đang bị khóa (`sealed: true`), script tự động đọc 3 khóa giải mã từ file `cluster-keys.json` và mở khóa Vault.
4.  Kiểm tra xem KV Secrets Engine phiên bản 2 tại đường dẫn `secret/` đã được kích hoạt chưa (do ở chế độ Prod mặc định chưa bật), nếu chưa sẽ tiến hành kích hoạt.
5.  Thực hiện ghi toàn bộ các khóa kết nối cơ sở dữ liệu, Redis, Kafka của 9 microservices vào Vault.

---

## 5. Phân Quyền Bảo Mật Cho Microservices (Policies)

Tuyệt đối không cấp `Root Token` cho microservices kết nối vào Vault. Thay vào đó, hãy áp dụng nguyên tắc đặc quyền tối thiểu (Least Privilege).

### 5.1. Thiết lập chính sách (Vault Policies)
Ví dụ, tạo một chính sách chỉ cho phép đọc thông tin cấu hình của `account-service` tại `secret/data/account-service`:

Tạo tệp chính sách `account-service-policy.hcl`:
```hcl
path "secret/data/account-service" {
  capabilities = ["read"]
}
```

Nạp chính sách vào Vault:
```bash
docker exec -it mom-vault vault policy write account-service account-service-policy.hcl
```

### 5.2. Sinh Token giới hạn thời gian (Service Token)
Sinh một Token chỉ có quyền của chính sách `account-service` và có thời hạn sử dụng là 24 giờ (TTL = 24h):

```bash
docker exec -it mom-vault vault token create -policy=account-service -ttl=24h
```

Microservice `account-service` sẽ dùng token được sinh ra để lấy cấu hình kết nối DB từ Vault mà không có quyền xem thông tin của các service khác (như `authentication-service` hay `expense-service`).

---

## 6. Sao Lưu và Phục Hồi Dữ Liệu Raft (Backup & Restore)

Cơ chế Raft tích hợp trong Vault hỗ trợ tạo ảnh chụp trạng thái (Snapshot) rất nhanh chóng và an toàn.

### 6.1. Sao lưu dữ liệu (Backup)
Để tạo một bản backup nén của toàn bộ dữ liệu lưu trữ (secrets, policies, tokens...):

```bash
docker exec -it mom-vault vault operator raft snapshot save /vault/data/backup.snap
```
*Lưu ý:* Bản snapshot sẽ được lưu vào thư mục dữ liệu `/vault/data` bên trong container, tương đương với volume `vault_data` trên máy host.

### 6.2. Phục hồi dữ liệu (Restore)
Trong trường hợp xảy ra sự cố phần cứng hoặc mất mát dữ liệu, có thể phục hồi lại từ bản snapshot:

```bash
docker exec -it mom-vault vault operator raft snapshot restore /vault/data/backup.snap
```

---

## 7. Khuyến Nghị Bảo Mật Thực Tế Cho Môi Trường Cloud Production

Khi triển khai hệ thống lên môi trường Kubernetes/AWS/GCP thực tế:
1.  **Auto-Unseal (Giải mã tự động):** 
    Cấu hình sử dụng Cloud KMS (AWS KMS, Azure Key Vault, Google KMS) để tự động giải mã Vault khi container khởi chạy mà không cần sự can thiệp thủ công của quản trị viên và không cần lưu trữ file khóa cục bộ.
2.  **Kích hoạt HTTPS/TLS:**
    Bật cấu hình TLS (`tls_disable = "false"`) và cung cấp chứng chỉ số hợp lệ (CA-signed certificates) để mã hóa toàn bộ lưu lượng dữ liệu đi và đến Vault trên đường truyền mạng.
3.  **Tích hợp Kubernetes Auth Method:**
    Sử dụng cơ chế ServiceAccount của Kubernetes để microservices tự động xác thực với Vault và lấy Token động, loại bỏ hoàn toàn việc lưu trữ tĩnh các Token trong file cấu hình microservices.
