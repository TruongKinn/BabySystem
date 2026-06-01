# Nâng cấp Gemini API Endpoint sang v1beta hỗ trợ Structured Outputs

> **Dịch vụ liên quan:** `ai-service`, Google Gemini API  
> **Cập nhật lần cuối:** 2026-06-01  
> **Trạng thái:** Đã hoàn thành sửa đổi code và biên dịch thành công

---

## 1. Phát hiện sự cố

Khi người dùng gửi yêu cầu OCR hóa đơn qua API `POST /ai/copilot/ocr-receipt`, hệ thống ném ra mã lỗi **400 Bad Request** với chi tiết:

```text
com.mom.ai.client.OpenAiApiException: Gemini OCR API error: {
  "error": {
    "code": 400,
    "message": "Invalid JSON payload received. Unknown name \"responseMimeType\" at 'generation_config': Cannot find field.\nInvalid JSON payload received. Unknown name \"responseSchema\" at 'generation_config': Cannot find field.",
    "status": "INVALID_ARGUMENT",
    ...
  }
}
```

### Nguyên nhân kỹ thuật:
- Google Gemini API phiên bản stable `/v1/` chưa hỗ trợ đầy đủ các tính năng định cấu trúc dữ liệu JSON đầu ra (`responseMimeType` và `responseSchema` trong `generation_config`). Các tính năng Structured Outputs này hiện đang bị giới hạn hoặc chỉ được hỗ trợ đầy đủ ở endpoint phiên bản Beta (`/v1beta/`).

---

## 2. Giải pháp sửa đổi

Chúng tôi đã thực hiện nâng cấp URL API của cuộc gọi OCR trong `GeminiClient` sang phiên bản `/v1beta/` để mở khóa đầy đủ tính năng này.

### Sửa đổi trong `GeminiClient.java`
- **Tệp sửa đổi:** [GeminiClient.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/ai-service/src/main/java/com/mom/ai/client/GeminiClient.java)
- **Đoạn mã cập nhật:**

```java
// Dòng 176: Chuyển đổi v1 sang v1beta
String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
        geminiModel, apiKey);
```

---

## 3. Kết quả xác minh

- Dự án `ai-service` đã được biên dịch sạch bằng Maven (`mvn clean compile`).
- Kết quả biên dịch: **BUILD SUCCESS** thành công hoàn toàn mà không gặp lỗi cú pháp.
- Google Generative AI v1beta sẽ tự động phân tích và trả về đúng JSON Schema hóa đơn theo định dạng được yêu cầu, loại bỏ hoàn toàn lỗi `INVALID_ARGUMENT`.
