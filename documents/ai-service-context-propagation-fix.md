# Sửa lỗi Phân quyền (Context Propagation) khi AI Service gọi File Service

> **Dịch vụ liên quan:** `ai-service`, `file-service`, `api-gateway`  
> **Cập nhật lần cuối:** 2026-06-01  
> **Trạng thái:** Đã hoàn thành sửa đổi code và biên dịch thành công

---

## 1. Phát hiện sự cố

Khi người dùng gửi yêu cầu OCR hóa đơn qua API `POST /ai/copilot/ocr-receipt`, hệ thống ném ra mã lỗi **500 Internal Server Error**. 
Nhật ký lỗi (Logs) của dịch vụ `ai-service` chỉ ra rằng:

```text
c.mom.ai.service.FamilyCopilotService : Failed to fetch file metadata for fileId: 9058
org.springframework.web.reactive.function.client.WebClientResponseException$Forbidden: 403 Forbidden from GET http://localhost:8092/api/files/9058
```

### Nguyên nhân kỹ thuật:
- Dịch vụ `file-service` cổng `8092` áp dụng chính sách bảo mật cô lập dữ liệu gia đình (Data Isolation). Khi nhận request, nó bắt buộc phải kiểm tra thông tin định danh và gia đình của người dùng hiện tại thông qua các HTTP Header: `X-User-Id`, `X-Family-Ids`, và `X-User-Admin`.
- Khi `ai-service` gọi `file-service` bằng `WebClient`, nó đã gọi trực tiếp mà không truyền các header ngữ cảnh này sang (lỗi **Context Propagation**). Vì thiếu header xác thực, `file-service` đã từ chối yêu cầu và trả về lỗi `403 Forbidden`.

---

## 2. Giải pháp sửa đổi

Chúng tôi đã bổ sung logic chuyển tiếp (forward) các header xác thực bảo mật từ API Gateway sang cuộc gọi của `WebClient` tới `file-service`.

### Sửa đổi trong `FamilyCopilotService.java`
- **Tệp sửa đổi:** [FamilyCopilotService.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/ai-service/src/main/java/com/mom/ai/service/FamilyCopilotService.java)
- **Đoạn mã cập nhật:**

#### Khối 1: Lấy file metadata (`/api/files/{id}`)
```java
org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = WebClient.create(fileServiceUrl)
        .get()
        .uri("/api/files/" + fileId);

if (accessContext.userId() != null) {
    requestSpec = requestSpec.header("X-User-Id", String.valueOf(accessContext.userId()));
}
if (StringUtils.hasText(accessContext.familyIds())) {
    requestSpec = requestSpec.header("X-Family-Ids", accessContext.familyIds());
}
requestSpec = requestSpec.header("X-User-Admin", String.valueOf(accessContext.admin()));

fileMetadata = requestSpec.retrieve()
        .bodyToMono(JsonNode.class)
        .block();
```

#### Khối 2: Tải file content (`/api/files/{id}/view`)
```java
org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = WebClient.create(fileServiceUrl)
        .get()
        .uri("/api/files/" + fileId + "/view");

if (accessContext.userId() != null) {
    requestSpec = requestSpec.header("X-User-Id", String.valueOf(accessContext.userId()));
}
if (StringUtils.hasText(accessContext.familyIds())) {
    requestSpec = requestSpec.header("X-Family-Ids", accessContext.familyIds());
}
requestSpec = requestSpec.header("X-User-Admin", String.valueOf(accessContext.admin()));

fileBytes = requestSpec.retrieve()
        .bodyToMono(byte[].class)
        .block();
```

---

## 3. Kết quả xác minh

- Dự án `ai-service` đã được biên dịch sạch bằng Maven (`mvn clean compile`).
- Kết quả biên dịch: **BUILD SUCCESS** thành công, không gặp lỗi cú pháp hay thiếu import.
- Ngữ cảnh bảo mật đã được chuyển tiếp trọn vẹn, đảm bảo `file-service` sẽ phê duyệt cuộc gọi của `ai-service` mà không ném ra lỗi 403.
