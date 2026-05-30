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

## 6. Khắc phục Lỗi Nhập Bất Đồng Bộ 20.000 Dòng Chi Tiêu (Async Import)

### A. Hiện tượng lỗi
Khi người dùng tải tệp Excel mẫu chứa 20.000 dòng dữ liệu chi tiêu gia đình về và thực hiện nhập bất đồng bộ (Async Import) qua Tab 2, tiến trình import chạy ngầm thất bại 100% (20.000 dòng lỗi). Logs database ghi nhận lỗi chi tiết: `"Dòng trống hoặc Danh mục/Số tiền không hợp lệ."`

### B. Nguyên nhân lỗi kỹ thuật
1. **Lỗi `ClassCastException` trong WebClient/RestClient (`IntegrationService.java`)**:
   Khi `file-service` chạy ngầm, nó gọi API `GET /api/expenses/categories?familyId=...` của `expense-service` qua RestClient để lấy danh mục chi tiêu. Tuy nhiên, code Java thực hiện ép kiểu sai:
   `requestSpec = injectSecurityHeaders((RestClient.RequestBodySpec) requestSpec, userId, familyIdsHeader, isAdmin);`
   Do request `GET` trả về `RequestHeadersSpec`, việc ép kiểu sang `RequestBodySpec` gây ra `ClassCastException`, kích hoạt khối `catch` và trả về danh sách danh mục rỗng (`List.of()`).
2. **Không map được CategoryId**:
   Vì danh sách danh mục rỗng, biến `categoryId` luôn bị `null` ở tất cả các dòng, khiến tiến trình import coi các dòng này là không hợp lệ và báo lỗi.
3. **Danh mục trong tệp mẫu bị lệch**:
   Tệp mẫu Excel sinh ra category dạng `"BabyCare"` (viết liền), trong khi database thực tế lưu trữ `"Baby Care"` (có dấu cách).

### C. Giải pháp khắc phục
1. **Sửa phương thức `injectSecurityHeaders`**:
   Cập nhật [IntegrationService.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/file-service/src/main/java/com/mom/file/service/IntegrationService.java) để nạp Header bảo mật trực tiếp trên interface `RequestHeadersSpec<?>` thay vì ép kiểu sang `RequestBodySpec`, loại bỏ hoàn toàn lỗi `ClassCastException`:
   ```java
   private RestClient.RequestHeadersSpec<?> injectSecurityHeaders(RestClient.RequestHeadersSpec<?> spec, Long userId, String familyIdsHeader, boolean isAdmin) { ... }
   ```
2. **Chuẩn hóa danh mục sinh ra ở tệp mẫu**:
   Cập nhật [DocumentParseService.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/file-service/src/main/java/com/mom/file/service/DocumentParseService.java) để sinh ra các danh mục trùng khớp 100% với database: `Meals`, `Shopping`, `Baby Care` (có dấu cách), `Utilities`, `Others`.
3. **Rebuild và Khởi động lại**:
   - Tiến hành chạy `mvn clean package -DskipTests` để đóng gói lại `file-service`.
   - Dịch vụ cũ đã được tắt và khởi động lại thành công trên cổng `8092` ở PID mới `4936`.
   - Đã đồng bộ PID mới vào `started-services.json`.

## 7. Khắc phục lỗi gọi sai URI lấy danh mục chi tiêu (Cập nhật 2026-05-30)

### A. Hiện tượng lỗi
Khi người dùng tải lên tệp tin template Excel chi tiêu lớn (ví dụ: `expense_20000_records_import_template.xlsx` với 20.000 dòng dữ liệu mẫu), tiến trình chạy ngầm báo lỗi `"Dòng trống hoặc Danh mục/Số tiền không hợp lệ."` trên toàn bộ 20.000 dòng mặc dù dữ liệu trong tệp tin mẫu hoàn toàn hợp lệ.

### B. Nguyên nhân lỗi kỹ thuật
1. **Gọi sai API Endpoint trực tiếp**:
   Trong [IntegrationService.java](file:///d:/AI-AGENT/BabySystem/codebase/backend/file-service/src/main/java/com/mom/file/service/IntegrationService.java), phương thức `getExpenseCategories` gọi trực tiếp đến dịch vụ `expense-service` (cổng `8083`) bằng RestClient:
   ```java
   .uri(expenseServiceUri + "/api/expenses/categories?familyId=" + familyId)
   ```
   Tuy nhiên, tại `ExpenseController.java` của `expense-service`, class level mapping là `/api` và method level mapping là `/categories`.
   Do đó, endpoint thực tế trực tiếp trên cổng `8083` là `/api/categories`. 
   Đường dẫn `/api/expenses/categories` chỉ tồn tại thông qua định tuyến RewritePath của API Gateway (`/expense/**` -> `/api/**`), nhưng do `file-service` gọi trực tiếp (bypass Gateway) nên yêu cầu HTTP bị trả về lỗi **404 Not Found**.
2. **Không có danh mục để map**:
   Do API bị lỗi 404, khối `catch` trong `getExpenseCategories` bắt ngoại lệ và trả về một danh sách danh mục rỗng (`List.of()`).
   Khi danh sách danh mục rỗng, `AsyncImportService.java` không thể ánh xạ được bất kỳ `categoryId` nào (luôn trả về `null`). Điều này kích hoạt điều kiện báo lỗi `"Dòng trống hoặc Danh mục/Số tiền không hợp lệ."` trên toàn bộ các dòng của tệp tin Excel.

### C. Giải pháp khắc phục
1. **Sửa URI API trong `IntegrationService.java`**:
   Thay đổi URI từ `/api/expenses/categories?familyId=` thành `/api/categories?familyId=` để gọi trực tiếp endpoint lấy danh mục chính xác trên `expense-service`.
2. **Rebuild và Khởi động lại**:
   - Chạy lệnh biên dịch lại dịch vụ:
     ```bash
     .\mvnw.cmd clean package -DskipTests
     ```
   - Stop tiến trình cũ ở cổng `8092` và khởi động lại dịch vụ thành công ở PID `29004`.
   - Cập nhật thông tin PID mới vào `started-services.json` để đồng bộ hệ thống.

---
*Tài liệu được cập nhật tự động bởi Antigravity AI Assistant.*
