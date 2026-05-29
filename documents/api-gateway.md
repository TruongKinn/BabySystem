# API Gateway Service - Cấu hình Timeout cho AI Service

Tài liệu này ghi lại các thay đổi và cấu hình liên quan đến **API Gateway** để hỗ trợ gọi API xử lý ngôn ngữ tự nhiên từ **AI Service** (Copilot).

## Vấn đề gặp phải
Khi Front-end gọi API `/ai/copilot/chat` thông qua API Gateway (`http://localhost:4953/ai/copilot/chat`), hệ thống thường xuyên trả về lỗi:
- `502 Bad Gateway` hoặc `503 Service Unavailable`.

### Nguyên nhân
1. **Response Timeout quá ngắn**: Mặc định, cấu hình phản hồi HTTP chung của API Gateway là `response-timeout: 5s` (5 giây). Tuy nhiên, các yêu cầu xử lý từ AI (gửi tới Gemini API) thường tốn nhiều thời gian hơn (từ 10 giây đến 30 giây hoặc hơn tùy thuộc độ dài văn bản).
2. **Circuit Breaker bị kích hoạt**: Gateway sử dụng `resilience4j` làm Circuit Breaker cho dịch vụ `aiServiceGateway`. Do cấu hình thời gian giới hạn mặc định (`timelimiter.configs.default.timeoutDuration`) là `10s`, khi AI phản hồi lâu hơn 10 giây, Circuit Breaker sẽ ghi nhận là lỗi và ngắt kết nối. Sau một số lần lỗi liên tiếp, Circuit Breaker chuyển sang trạng thái `OPEN` khiến mọi request tiếp theo lập tức trả về `503 Service Unavailable` mà không cần gửi tới AI Service nữa.

## Giải pháp triển khai
Để giải quyết triệt để lỗi này, chúng tôi đã nâng cấp cấu hình trong file [application.yml](file:///d:/AI-AGENT/BabySystem/codebase/backend/api-gateway/src/main/resources/application.yml) của `api-gateway`:

### 1. Tăng Response Timeout riêng cho AI Route
Trong định nghĩa route `ai-service`, chúng tôi thêm cấu hình `metadata.response-timeout` riêng là **60000ms** (60 giây), giữ nguyên timeout chung 5s cho các service khác để đảm bảo tính an toàn hệ thống:
```yaml
        - id: ai-service
          uri: ${AI_SERVICE_URI:http://localhost:8104}
          predicates:
            - Path=/ai/**
          metadata:
            response-timeout: 60000
          filters:
            - RewritePath=/ai/(?<segment>.*), /api/$\{segment}
            - name: CircuitBreaker
              args:
                name: aiServiceGateway
                fallbackUri: forward:/gateway/fallback/ai-service
```

### 2. Tăng Timeout Duration cho Circuit Breaker (TimeLimiter)
Bổ sung cấu hình `aiServiceGateway` riêng biệt vào phần `timelimiter.instances` với giá trị `timeoutDuration: 60s` để Circuit Breaker không tự ý ngắt kết nối khi AI đang xử lý:
```yaml
  timelimiter:
    configs:
      default:
        timeoutDuration: 10s
        cancelRunningFuture: true
    instances:
      commonServiceGateway:
        timeoutDuration: 30s
        cancelRunningFuture: true
      aiServiceGateway:
        timeoutDuration: 60s
        cancelRunningFuture: true
```

## Kết quả
Sau khi áp dụng cấu hình và khởi động lại API Gateway, kết nối từ Front-end tới AI Copilot hoạt động trơn tru mà không còn bị ngắt giữa chừng do quá thời gian chờ, khắc phục hoàn toàn lỗi `502` và `503`.
