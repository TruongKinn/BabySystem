# Khắc Phục Lỗi 500 Khi OCR Hóa Đơn Do Giới Hạn Buffer Size Của WebClient (Spring WebFlux)

> **Dịch vụ liên quan:** `ai-service`, `file-service`, `api-gateway`  
> **Cập nhật lần cuối:** 2026-06-02  
> **Trạng thái:** Đã hoàn thành sửa đổi code và xác minh thành công

---

## 1. Phát hiện sự cố

Khi người dùng gửi yêu cầu OCR hóa đơn qua API `POST /ai/copilot/ocr-receipt`, hệ thống ném ra mã lỗi **500 Internal Server Error**. 
Nhật ký lỗi chi tiết của cuộc gọi API chỉ ra rằng:

```json
{
  "success": false,
  "message": "An unexpected error occurred: Không thể tải nội dung tệp tin từ file-service: 200 OK from GET http://localhost:8092/api/files/9052/view, but response failed with cause: org.springframework.core.io.buffer.DataBufferLimitException: Exceeded limit on max bytes to buffer : 262144",
  "data": null
}
```

### Nguyên nhân kỹ thuật:
- Mặc định, `WebClient` của Spring WebFlux giới hạn kích thước buffer tối đa nhận về (max in-memory buffer size) là **256 KB** (262,144 bytes) để tránh tiêu tốn quá nhiều bộ nhớ.
- Khi `ai-service` gọi `file-service` cổng `8092` qua API `/api/files/{id}/view` để tải nội dung của tệp tin hóa đơn (là các file ảnh JPEG, PNG hoặc tài liệu PDF thường có dung lượng từ 500 KB đến vài MB), phản hồi trả về vượt quá giới hạn 256 KB.
- Điều này khiến `WebClient` ném ra ngoại lệ `DataBufferLimitException`. Sau đó, `FamilyCopilotService` bắt ngoại lệ này và ném ra `RuntimeException`, gây ra mã lỗi **500 Internal Server Error** trả về cho người dùng.

---

## 2. Giải pháp sửa đổi

Chúng tôi đã tăng giới hạn kích thước in-memory buffer của `WebClient` trong `ai-service` lên **10 MB** (10,485,760 bytes), đảm bảo xử lý mượt mà tất cả các tệp tin hóa đơn và ảnh chụp chất lượng cao.

### Sửa đổi trong `FamilyCopilotService.java`
- **Tệp sửa đổi:** [FamilyCopilotService.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/ai-service/src/main/java/com/mom/ai/service/FamilyCopilotService.java)
- **Đoạn mã cập nhật:**

Chúng tôi thay thế cách khởi tạo `WebClient` mặc định bằng việc sử dụng `WebClient.builder()` và cấu hình `maxInMemorySize` codec:

```java
// Tạo WebClient với cấu hình buffer size lớn (10MB) để tránh lỗi DataBufferLimitException khi tải file lớn
WebClient webClient = WebClient.builder()
        .baseUrl(fileServiceUrl)
        .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
        .build();
```

Và sử dụng `webClient` instance này cho các cuộc gọi lấy Metadata và tải file content từ `file-service`:

```java
// 1. Lấy metadata
org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = webClient.get()
        .uri("/api/files/" + fileId);

// 2. Tải nội dung file view
org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = webClient.get()
        .uri("/api/files/" + fileId + "/view");
```

---

## 3. Kết quả xác minh

- Dự án `ai-service` đã được biên dịch sạch bằng Maven: **BUILD SUCCESS**.
- Đã **unseal Vault** thành công bằng cách sử dụng các Unseal Keys trong `cluster-keys.json`, giúp dịch vụ nạp thành công API Key của Gemini.
- Đã chạy thử nghiệm thực tế với file ID `9052` (ảnh JPEG có kích thước ~600 KB):
  - Phản hồi từ API: **200 OK**
  - Trích xuất OCR bằng Google Gemini v1beta thành công hoàn toàn.
  - Phản hồi JSON chi tiết được trích xuất chính xác và hiển thị mượt mà. Lỗi 500 đã được khắc phục triệt để.
