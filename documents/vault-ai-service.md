# Hướng Dẫn Tích Hợp Vault Cho AI Service - Tự Động Hóa Cấu Hình

Tài liệu này hướng dẫn chi tiết về cơ chế tích hợp **HashiCorp Vault** cho **AI Service** (`ai-service`) nhằm lưu trữ bảo mật API Key của trợ lý AI Copilot, cùng cơ chế tự động cấu hình Token (Auto Token Resolver) không cần thiết lập thủ công.

---

## 1. Mục Tiêu Thiết Kế
* **Bảo mật tuyệt đối**: Tuyệt đối không lưu trữ API Key thô (như Gemini/OpenAI key) trong file mã nguồn, file cấu hình của Git tracking hay biến môi trường tĩnh của hệ thống.
* **Tự động hóa hoàn toàn (Zero Configuration)**: Nhà phát triển ở môi trường cục bộ (Local Development) không cần phải cấu hình thủ công biến môi trường `VAULT_TOKEN` trong IntelliJ IDEA hoặc hệ điều hành. Hệ thống tự động nhận diện, unseal và gán token để kết nối.

---

## 2. Kiến Trúc Tích Hợp Vault

AI Service sử dụng **Spring Cloud Vault Config** để tự động liên kết và nạp cấu hình từ Vault khi khởi động.

### A. Cấu hình Maven (`pom.xml`)
Đã bổ sung thư viện Spring Cloud Vault Client và cấu hình quản lý phiên bản Spring Cloud vào [pom.xml](file:///d:/AI-AGENT/BabySystem/codebase/backend/ai-service/pom.xml):
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2023.0.3</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### B. Cấu hình Spring Boot (`application.yml`)
Trong file [application.yml](file:///d:/AI-AGENT/BabySystem/codebase/backend/ai-service/src/main/resources/application.yml) của `ai-service`, kích hoạt cơ chế kéo secrets từ KV Secrets Engine phiên bản 2 tại đường dẫn `secret/data/ai-service`:
```yaml
spring:
  config:
    import: "optional:vault://"
  cloud:
    vault:
      uri: ${VAULT_URI:http://localhost:8200}
      authentication: TOKEN
      token: ${VAULT_TOKEN:root}
      kv:
        enabled: true
        backend: secret
        default-context: ai-service
```

---

## 3. Cơ Chế Tự Động Hóa Vượt Trội: Auto Token Resolver

Thông thường, khi chạy Vault ở chế độ Production/Local Bootstrap, Vault unseal bằng một mã Root Token ngẫu nhiên (lưu tại `cluster-keys.json`). Việc này dẫn đến việc sử dụng token `"root"` mặc định sẽ bị lỗi `403 Forbidden`.

Để nhà phát triển không cần điền thủ công Token vào IntelliJ, lớp khởi chạy [AiServiceApplication.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/ai-service/src/main/java/com/mom/ai/AiServiceApplication.java) đã được trang bị cơ chế tự động hóa:

### Luồng xử lý trong code Java:
1. **Kiểm tra môi trường**: Chương trình kiểm tra xem biến môi trường `VAULT_TOKEN` có trống hoặc đang để mặc định là `"root"` hay không.
2. **Dò tìm File Khóa (`cluster-keys.json`)**: Code tự động tìm tệp tin bảo mật chứa khóa unseal và root token tại các đường dẫn tương đối phổ biến:
   - `../../infrastructure/vault/cluster-keys.json` (chạy từ thư mục service)
   - `codebase/infrastructure/vault/cluster-keys.json` (chạy từ thư mục gốc dự án)
3. **Trích xuất Root Token**: Sử dụng biểu thức chính quy (Regex) để tìm trường `"root_token"` và lấy ra chuỗi khóa thực tế (ví dụ: `hvs.your-vault-root-token-here`).
4. **Tự động cấu hình hệ thống**: Gán giá trị này vào thuộc tính hệ thống `System.setProperty("spring.cloud.vault.token", rootToken)` để Spring Cloud Vault tự động sử dụng khi kết nối.

```java
private static void autoConfigureVaultToken() {
    String envToken = System.getenv("VAULT_TOKEN");
    String propToken = System.getProperty("spring.cloud.vault.token");

    if ((envToken == null || envToken.trim().isEmpty() || "root".equals(envToken)) &&
        (propToken == null || propToken.trim().isEmpty() || "root".equals(propToken))) {

        String[] possiblePaths = {
            "../../infrastructure/vault/cluster-keys.json",
            "codebase/infrastructure/vault/cluster-keys.json",
            "../infrastructure/vault/cluster-keys.json",
            "infrastructure/vault/cluster-keys.json"
        };

        for (String path : possiblePaths) {
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                try {
                    String content = new String(Files.readAllBytes(file.toPath()));
                    Pattern pattern = Pattern.compile("\"root_token\"\\s*:\\s*\"([^\"]+)\"");
                    Matcher matcher = pattern.matcher(content);
                    if (matcher.find()) {
                        String rootToken = matcher.group(1);
                        System.setProperty("spring.cloud.vault.token", rootToken);
                        System.out.println("[Vault AutoConfig] Successfully auto-configured Vault Token from: " + file.getAbsolutePath());
                        return;
                    }
                } catch (Exception e) {
                    System.err.println("[Vault AutoConfig] Failed to read Vault keys: " + e.getMessage());
                }
            }
        }
    }
}
```

---

## 4. Tự Động Hóa Với Script Bootstrap Cục Bộ

Cấu hình của `ai-service` đã được tích hợp vào các script tự động nạp secrets của hệ thống để đồng bộ hóa cho toàn bộ thành viên trong đội ngũ phát triển:
* **Script Windows**: [bootstrap-secrets.ps1](file:///d:/AI-AGENT/BabySystem/codebase/infrastructure/vault/bootstrap-secrets.ps1)
* **Script Linux/Mac**: [bootstrap-secrets.sh](file:///d:/AI-AGENT/BabySystem/codebase/infrastructure/vault/bootstrap-secrets.sh)

Khi chạy script bootstrap, Vault sẽ tự động được unseal (nếu đang bị khóa) và một bí mật mẫu sẽ được ghi vào Vault tại `secret/ai-service`:
```bash
vault kv put secret/ai-service \
  OPENAI_API_KEY='your-gemini-api-key-here'
```

---

## 5. Hướng Dẫn Vận Hành & Sử Dụng

### A. Khởi chạy thông thường (IntelliJ IDEA)
Bạn chỉ cần mở dự án trong IntelliJ, mở file `AiServiceApplication.java` và nhấn nút **Run ▶️** hoặc **Debug 🪲**.
* Hệ thống sẽ in ra log: `[Vault AutoConfig] Successfully auto-configured Vault Token from: .../cluster-keys.json`
* AI Service sẽ kết nối thành công và sẵn sàng phục vụ.

### B. Cách cập nhật API Key thật vào Vault (Bảo mật 100%)
Để nạp hoặc thay đổi API Key Gemini/OpenAI thật của bạn vào Vault (thay thế cho key giả lập mẫu ở trên), bạn chỉ cần chạy một dòng lệnh duy nhất từ Terminal (Token root sẽ tự động được nạp):

```powershell
docker exec mom-vault sh -c "export VAULT_TOKEN='hvs.your-vault-root-token-here'; vault kv put secret/ai-service OPENAI_API_KEY='KHOA_API_GEMINI_THAT_CUA_BAN'"
```
*Lưu ý:* Mã token root `hvs.your-vault-root-token-here` được lấy trực tiếp từ file `cluster-keys.json` cục bộ của bạn.
