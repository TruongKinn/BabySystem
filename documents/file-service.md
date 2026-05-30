# Tài liệu Khắc phục Lỗi Upload và Phân tích File Excel (file-service)

Tài liệu này ghi nhận quá trình kiểm tra, phát hiện nguyên nhân và triển khai các sửa đổi để giải quyết triệt để lỗi khi người dùng tải lên và phân tích (parse) các file Excel trên hệ thống, đặc biệt tại chức năng **Nhập chi tiêu từ Excel** (`/app/documents`).

---

## 1. Hiện tượng lỗi ban đầu
Khi người dùng truy cập trang **Document Hub & Nhập liệu thông minh** (`http://localhost:4200/app/documents`), chuyển sang tab **Nhập chi tiêu từ Excel** và tải lên một file không đúng định dạng Excel (hoặc cấu trúc lỗi), hệ thống:
- Trả về mã lỗi HTTP `500 Internal Server Error` từ backend.
- Trên giao diện người dùng chỉ hiển thị thông báo lỗi chung chung và mơ hồ: *"An unexpected error occurred"* hoặc không có phản hồi rõ ràng, gây khó khăn cho việc đối soát dữ liệu.
- Các tab upload khác gặp lỗi không thể tải lên trơn tru do cơ chế bắt lỗi (error handling) ở frontend chưa hoàn thiện.

---

## 2. Nguyên nhân kỹ thuật

Sau khi rà quét chi tiết cả hai đầu Backend và Frontend, chúng tôi phát hiện 2 nguyên nhân cốt lõi:

### Vấn đề 1: Thiếu Exception Handler cho `IllegalStateException` ở Backend
- Khi quá trình parse file Excel gặp sự cố (ví dụ: file bị lỗi, trống hoặc không đúng định dạng zip/excel), lớp `DocumentParseService.parseExcel()` sẽ ném ra ngoại lệ:
  ```java
  throw new IllegalStateException("Failed to parse Excel: " + e.getMessage(), e);
  ```
- Tuy nhiên, tại lớp cấu hình xử lý ngoại lệ tập trung `RestExceptionHandler.java` của `file-service` **không hề khai báo phương thức xử lý cho `IllegalStateException`**.
- Hệ quả là Spring Boot tự động bắt ngoại lệ này và trả về phản hồi lỗi 500 mặc định với cấu trúc HTML/JSON của Spring (thiếu các trường chuẩn của dự án như `success: false` và `message`).
- Do đó, Frontend không thể bóc tách được nội dung lỗi chi tiết từ server để hiển thị cho người dùng.

### Vấn đề 2: Cơ chế Error Handling ở Frontend chưa tối ưu
- Trong file `documents.component.ts`, các luồng gọi `forkJoin` để tải lên nhiều tệp tin (`uploadBabyDocuments` và `uploadGeneralDocuments`) không khai báo khối xử lý lỗi `error` trong phương thức `.subscribe(...)`. Khi một tệp tin tải lên bị lỗi, nó có thể dẫn đến việc toàn bộ tiến trình bị sập mà không đưa ra cảnh báo thích hợp.
- Trình bắt lỗi `catchError` trong component chỉ đọc `err.message` thô từ `HttpErrorResponse` dẫn đến việc hiển thị chuỗi lỗi kết nối mạng mặc định của Angular thay vì lấy trực tiếp thông báo lỗi chi tiết từ server (`err.error?.message`).

---

## 3. Các bước xử lý và khắc phục

Chúng tôi đã thực hiện nâng cấp toàn diện ở cả hai đầu hệ thống:

### Bước 1: Bổ sung Exception Handler tại Backend (`file-service`)
Đã chỉnh sửa file [RestExceptionHandler.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/file-service/src/main/java/com/mom/file/controller/RestExceptionHandler.java) để bổ sung bộ xử lý cho `IllegalStateException` và trả về định dạng `ApiResponse` chuẩn (mã lỗi HTTP 409 Conflict):

```java
@ExceptionHandler(IllegalStateException.class)
public ResponseEntity<ApiResponse<Void>> handleIllegalStateException(IllegalStateException ex) {
    ApiResponse<Void> response = ApiResponse.<Void>builder()
            .success(false)
            .message(ex.getMessage())
            .build();
    return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
}
```

### Bước 2: Tối ưu hóa xử lý lỗi tại Frontend
Đã tiến hành cập nhật [documents.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/documents/documents.component.ts):
1. **Trích xuất thông báo lỗi chính xác từ Server**: Thay vì đọc `err.message` thô, chúng tôi cải tiến trình bắt lỗi để lấy đúng thông tin nghiệp vụ mà backend trả về:
   ```typescript
   const errMsg = err?.error?.message || err?.message || 'Lỗi không xác định';
   ```
2. **Bổ sung các Error Handlers cho `forkJoin` subscriptions**: Đảm bảo mọi phản hồi thất bại khi tải lên hàng loạt đều được bắt và hiển thị thông báo trực quan tới người dùng thay vì gây crash ngầm ứng dụng.

### Bước 3: Rebuild và Khởi động lại Dịch vụ
- Build lại dịch vụ `file-service` sử dụng Maven:
  ```bash
  ./mvnw.cmd package -DskipTests
  ```
- Dịch vụ cũ đã được tắt và khởi động lại thành công bằng file JAR mới trên cổng `8092`:
  ```bash
  java -jar codebase/backend/file-service/target/file-service-0.0.1-SNAPSHOT.jar
  ```
  Hệ thống đã xác nhận trạng thái **LISTENING** trên cổng `8092` ổn định.

---

## 4. Kết quả nghiệm thu thực tế

Chúng tôi đã thực hiện kiểm thử tự động trực tiếp trên giao diện Angular thông qua DevTools:
1. **API Phản hồi chuẩn format**: Khi gửi một tệp không phải Excel lên endpoint `/file/files/parse/excel`, Gateway trả về mã HTTP `409 Conflict` kèm body JSON chuẩn hóa:
   ```json
   {
     "success": false,
     "message": "Failed to parse Excel: Cannot find zip signature within the file",
     "data": null
   }
   ```
2. **Giao diện thông báo trực quan**: Trình xử lý thông báo của NG-ZORRO (`NzNotificationService`) đã bắt trọn vẹn thông báo này và hiển thị popup đỏ cảnh báo chi tiết tới người dùng ở góc trên bên phải màn hình một cách vô cùng rõ ràng và chuyên nghiệp.

---

## 5. Tách biệt hoàn toàn luồng xử lý và giao diện Upload giữa các Tab

Để giải quyết triệt để vấn đề dùng chung trạng thái upload gây ảnh hưởng lẫn nhau giữa các tab (ví dụ: đang parse Excel ở Tab 2 nhưng lại hiển thị che phủ toàn bộ trang hoặc làm gián đoạn tương tác ở các tab khác), chúng tôi đã tiến hành cấu trúc lại (refactor) toàn bộ logic và giao diện upload:

### A. Phân tách biến trạng thái (State Isolation)
Thay vì sử dụng chung các biến toàn cục `uploading`, `uploadProgress`, và `dragOver` dễ gây xung đột, chúng tôi đã tách thành các biến riêng biệt cho từng tab:
- **Tab 1 (Hồ sơ của Bé)**: `babyUploading`, `babyUploadProgress`, `babyDragOver`
- **Tab 2 (Nhập chi tiêu từ Excel)**: `excelUploading`, `excelUploadProgress`, `excelDragOver`
- **Tab 3 (Tài liệu gia đình chung)**: `generalUploading`, `generalUploadProgress`, `generalDragOver`

### B. Tách riêng các sự kiện Handler (Event Isolation)
Tách hoàn toàn các hàm xử lý kéo thả (`dragover`, `dragleave`, `drop`) và chọn tệp (`change`) tương ứng với từng tab thay vì dùng chung một hàm phân loại bằng `activeTab`:
- **Tab 1**: `onBabyDragOver()`, `onBabyDragLeave()`, `onBabyFileDrop()`, `onBabyFileSelected()`
- **Tab 2**: `onExcelDragOver()`, `onExcelDragLeave()`, `onExcelFileDrop()`, `onExcelFileSelected()`
- **Tab 3**: `onGeneralDragOver()`, `onGeneralDragLeave()`, `onGeneralFileDrop()`, `onGeneralFileSelected()`

### C. Giao diện che phủ độc lập từng Tab (Tab-Specific Overlay)
- Loại bỏ lớp phủ progress bar toàn màn hình (`position: fixed`) vốn khóa toàn bộ ứng dụng mỗi khi có tệp tải lên.
- Phát triển lớp phủ tuyệt đẹp ở dạng **Tab-Specific Overlay** (`position: absolute`) đặt bên trong phần tử `.tab-content-pane` (được cấu hình `position: relative`).
- **Trải nghiệm Premium**: Lớp phủ Glassmorphism VisionOS siêu mờ chỉ che phủ duy nhất nội dung của tab đang thực hiện upload, cho phép người dùng vẫn có thể nhìn thấy, chuyển đổi tab khác hoặc theo dõi tiến trình upload một cách cực kỳ mượt mà, trực quan và sống động.

---
*Tài liệu được tạo tự động bởi Antigravity AI Assistant.*
