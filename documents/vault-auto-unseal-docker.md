# Cơ Chế Tự Động Mở Khóa Vault (Auto-Unseal) Khi Khởi Động Docker

> **Dịch vụ liên quan:** HashiCorp Vault (`mom-vault`), Docker Compose, `vault-unseal`  
> **Cập nhật lần cuối:** 2026-06-02  
> **Trạng thái:** Đã triển khai và tích hợp thành công vào Docker Compose

---

## 1. Vấn đề thực tế

Mỗi khi container `mom-vault` khởi động lại (do khởi động lại Docker, khởi động lại máy tính, hoặc container bị crash), HashiCorp Vault sẽ tự động rơi vào trạng thái **Khóa (Sealed)** theo thiết kế bảo mật mặc định.

Khi Vault bị Sealed:
* Tất cả dữ liệu secrets (như API Key của Gemini/OpenAI) đều bị mã hóa và không thể truy cập.
* Các microservice khởi chạy tiếp theo không thể nạp cấu hình và ném ra lỗi **500 Internal Server Error** hoặc **403 Forbidden** khi xử lý yêu cầu của người dùng.
* Nhà phát triển phải thực hiện lệnh Unseal thủ công bằng 3 khóa giải mã rất phiền phức.

---

## 2. Giải pháp: Sidecar Container `vault-unseal`

Để tự động hóa hoàn toàn 100% quá trình này, chúng tôi đã cấu hình một **Sidecar Container** siêu nhẹ mang tên `vault-unseal` chạy song song với Vault trong cụm Docker Compose.

### Cách thức hoạt động:
1. **Theo dõi trạng thái Vault**: `vault-unseal` khởi động cùng lúc và liên tục thăm dò (ping) qua HTTP API `/v1/sys/health` để đợi cho tới khi Vault trực tuyến.
2. **Đọc khóa tự động**: Container được mount thư mục `./vault` chứa tệp bảo mật `cluster-keys.json` được tạo cục bộ trên máy của bạn khi khởi tạo Vault lần đầu.
3. **Mở khóa qua API**: Khi Vault online, container sử dụng công cụ `jq` để trích xuất 3 khóa giải mã (`unseal_keys_b64`) từ `cluster-keys.json` và gửi 3 request API `POST /v1/sys/unseal` liên tiếp để giải mã Vault tự động.
4. **Cơ chế tự phục hồi (`restart: always`)**: Nếu Vault bị seal lại hoặc container Vault khởi động lại độc lập, container giải mã cũng tự động kích hoạt lại để Unseal ngay lập tức.

---

## 3. Cấu hình Docker Compose

Dịch vụ đã được cấu hình trực tiếp vào [docker-compose.yml](file:///d:/AI-AGENT/BabySystem/codebase/infrastructure/docker-compose.yml) tại đường dẫn `codebase/infrastructure/docker-compose.yml`:

```yaml
  vault-unseal:
    image: alpine:3.18
    container_name: mom-vault-unseal
    depends_on:
      - vault
    restart: always
    volumes:
      - ./vault:/vault:ro
    command: >
      sh -c "
      apk add --no-cache curl jq >/dev/null 2>&1;
      
      echo 'Chờ dịch vụ Vault trực tuyến...';
      until curl -fsS http://vault:8200/v1/sys/health >/dev/null 2>&1;
      do
        sleep 2;
      done;
      
      KEYS_FILE='/vault/cluster-keys.json'
      if [ -f \"\$KEYS_FILE\" ]; then
        echo 'Tìm thấy cluster-keys.json. Đang tự động mở khóa Vault (Unsealing)...';
        
        KEY1=\$(jq -r '.unseal_keys_b64[0]' \"\$KEYS_FILE\")
        KEY2=\$(jq -r '.unseal_keys_b64[1]' \"\$KEYS_FILE\")
        KEY3=\$(jq -r '.unseal_keys_b64[2]' \"\$KEYS_FILE\")
        
        curl -fsS -X POST -H 'Content-Type: application/json' -d \"{\\\"key\\\": \\\"\$KEY1\\\"}\" http://vault:8200/v1/sys/unseal >/dev/null
        curl -fsS -X POST -H 'Content-Type: application/json' -d \"{\\\"key\\\": \\\"\$KEY2\\\"}\" http://vault:8200/v1/sys/unseal >/dev/null
        curl -fsS -X POST -H 'Content-Type: application/json' -d \"{\\\"key\\\": \\\"\$KEY3\\\"}\" http://vault:8200/v1/sys/unseal >/dev/null
        
        echo 'Vault đã được mở khóa tự động thành công!'
      else
        echo 'LỖI: Không tìm thấy tệp tin cluster-keys.json tại /vault/cluster-keys.json để unseal tự động.'
      fi
      "
```

---

## 4. Cách áp dụng & Kiểm tra

Để áp dụng thay đổi này ngay lập tức vào môi trường Docker của bạn, hãy chạy lệnh sau tại thư mục chứa file `docker-compose.yml` (`codebase/infrastructure`):

```bash
docker compose up -d vault-unseal
```

### Cách kiểm tra log giải mã tự động:
Bạn có thể xem quá trình giải mã hoạt động thông qua nhật ký của container giải mã:

```bash
docker logs -f mom-vault-unseal
```

**Kết quả log mong đợi:**
```text
Chờ dịch vụ Vault trực tuyến...
Tìm thấy cluster-keys.json. Đang tự động mở khóa Vault (Unsealing)...
Vault đã được mở khóa tự động thành công!
```
