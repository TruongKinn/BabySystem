# Khắc Phục Lỗi Debugger IntelliJ IDEA - Authentication Service

Tài liệu này hướng dẫn cách giải quyết lỗi khởi động ứng dụng `authentication-service` (Spring Boot) khi chạy ở chế độ **Debug** trong IntelliJ IDEA.

---

## 1. Mô Tả Lỗi

Khi khởi động ứng dụng ở chế độ Debug, Spring Boot gặp lỗi và dừng lại với Stacktrace tương tự như sau:

```text
java.lang.NoClassDefFoundError: com/intellij/rt/debugger/agent/CaptureStorage$6
	at com.intellij.rt.debugger.agent.CaptureStorage.insertExit(CaptureStorage.java:124) ~[na:1.47]
	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java) ~[na:na]
	at org.springframework.cglib.core.internal.LoadingCache.createEntry(LoadingCache.java:57) ~[spring-core-6.1.12.jar:6.1.12]
    ...
Exception in thread "main" java.lang.IllegalStateException: java.lang.NoClassDefFoundError: com/intellij/rt/debugger/agent/CaptureStorage$6
```

### Nguyên Nhân
1. **IntelliJ Debugger Agent**: Khi chạy ứng dụng ở chế độ Debug, IntelliJ IDEA tự động tích hợp một Java Agent nhằm hỗ trợ tính năng **Async Stack Traces** (theo vết ngăn xếp bất đồng bộ). Agent này sẽ can thiệp (instrument) vào các Class thực thi bất đồng bộ như `FutureTask`.
2. **CGLIB Proxy & ClassLoader Isolation**: Spring Boot (đặc biệt khi cấu hình `@Configuration` và sử dụng CGLIB để tạo proxy) sử dụng các ClassLoader riêng biệt. Khi các Class này được sinh ra động và tải bởi ClassLoader của Spring (hoặc `RestartClassLoader` của Spring Boot DevTools), ClassLoader này không thể nhìn thấy class `CaptureStorage$6` nằm trong jar của debugger agent của IntelliJ.
3. Kết quả là xảy ra lỗi `NoClassDefFoundError` khiến Spring Boot Context không thể khởi tạo thành công.

---

## 2. Các Giải Pháp Khắc Phục

### Giải Pháp 1: Tắt Tính Năng "Instrumenting Agent" (Khuyên Dùng)

Đây là giải pháp đơn giản, triệt để và phổ biến nhất mà không ảnh hưởng tới logic của ứng dụng.

1. Mở cửa sổ cấu hình cài đặt của IntelliJ IDEA:
   - Trên **Windows / Linux**: Nhấn `Ctrl + Alt + S` hoặc chọn `File` -> `Settings`.
   - Trên **macOS**: Nhấn `Cmd + ,` hoặc chọn `IntelliJ IDEA` -> `Preferences`.
2. Trong thanh tìm kiếm của Settings, gõ từ khóa: **`Async Stack Traces`** (hoặc tìm đến **Build, Execution, Deployment** -> **Debugger** -> **Data Views** -> **Java**).
3. Tại giao diện cấu hình của **Java Debugger**:
   - Tìm mục **Async Stack Traces**.
   - Bỏ chọn (Uncheck) ô **`Instrumenting agent (requires debugger restart)`** (hoặc **`Capture agent`** tùy theo phiên bản IntelliJ).
4. Nhấn **Apply** -> **OK** để lưu lại.
5. Thực hiện khởi động lại (Restart) phiên Debug của `authentication-service`.

> [!TIP]
> Việc tắt tính năng này chỉ làm giảm khả năng xem đầy đủ stacktrace của các luồng xử lý bất đồng bộ (Async threads) khi Debug, nhưng giúp ứng dụng chạy cực kỳ ổn định và tránh được các lỗi ClassLoader không mong muốn.

---

### Giải Pháp 2: Tắt Tính Năng Tự Động Khởi Động Lại của DevTools

Nếu bạn đang sử dụng Spring Boot DevTools trong dự án, ClassLoader của DevTools (`RestartClassLoader`) là nhân tố chính gây ra lỗi cô lập ClassLoader này. Nếu bạn không thực sự cần tính năng tự động reload của DevTools khi đang debug, bạn có thể vô hiệu hóa nó:

#### Cách A: Cấu hình thông qua VM Options của Run Configuration
1. Trên thanh công cụ chạy ứng dụng của IntelliJ, click vào menu xổ xuống của Run Configuration -> Chọn **Edit Configurations...**
2. Chọn cấu hình chạy của `AuthenticationServiceApplication`.
3. Trong phần **VM Options** (nếu chưa thấy, nhấn `Alt + V` hoặc click *Modify options* -> *Add VM options*), thêm cờ sau:
   ```text
   -Dspring.devtools.restart.enabled=false
   ```
4. Lưu cấu hình và khởi động lại Debug.

#### Cách B: Cấu hình trong file application.yml / application.properties
Nếu muốn áp dụng cho toàn bộ dự án mà không cần chỉnh sửa Run Configuration, bạn có thể thêm cấu hình sau vào file cấu hình Spring Boot của service:

**Trong file `application.yml`:**
```yaml
spring:
  devtools:
    restart:
      enabled: false
```

**Trong file `application.properties`:**
```properties
spring.devtools.restart.enabled=false
```

---

### Giải Pháp 3: Loại bỏ CGLIB Classes khỏi Capture Points (Nâng Cao)

Nếu bạn vẫn muốn giữ cả **Async Stack Traces** và **DevTools Restart**, bạn có thể yêu cầu IntelliJ debugger không theo vết (capture) đối với các proxy classes của Spring/CGLIB:

1. Vào **Settings** -> **Build, Execution, Deployment** -> **Debugger** -> **Async Stack Traces**.
2. Tại bảng **Capture Points**, bạn sẽ thấy danh sách các quy tắc capture.
3. Tìm và bỏ chọn (disable) hoặc xóa bỏ các quy tắc liên quan đến Spring hoặc CGLIB (ví dụ: `org.springframework.cglib.core.internal.LoadingCache`).
4. Nhấn **Apply** -> **OK** và restart phiên Debug.
