# Báo Cáo Khắc Phục Lỗi API 400 & Lỗi Hiển Thị Phân Trang Tại Màn Hình Mua Sắm (Shopping Component)

## 1. Lỗi API 400 Khi Tải Trang
Khi truy cập vào màn hình `http://localhost:4200/app/shopping`, frontend gửi các yêu cầu API lấy danh sách mặt hàng phân trang qua Gateway:
- `GET /shopping/shopping-items?familyId=1&page=0&size=1`
- `GET /shopping/shopping-items?familyId=1&page=0&size=10`

### A. Nguyên nhân lỗi (Root Cause)
* Phương thức xử lý `getFamilyItemsPage` trong `ShoppingService` của backend `shopping-service` được cấu hình lưu cache bằng `@Cacheable` của Spring Cache (Redis):
  ```java
  @Cacheable(value = "shopping-items", key = "#familyId + ':' + (#checked != null ? #checked : 'all') + ':' + (#search != null ? #search : '') + ':' + #page + ':' + #size")
  public PageResponse<ShoppingItemResponse> getFamilyItemsPage(Long familyId, Boolean checked, String search, int page, int size)
  ```
* Trình tuần tự hóa mặc định của Redis (`DefaultSerializer`) yêu cầu toàn bộ payload và các đối tượng bên trong danh sách phải triển khai interface `java.io.Serializable`.
* Tuy nhiên, cả hai record DTO trả về:
  1. `PageResponse<T>`
  2. `ShoppingItemResponse`
  đều **không** implements `Serializable`, dẫn đến ngoại lệ `SerializationException` phía backend và trả về lỗi **HTTP 400 (Bad Request)** cho frontend.

### B. Giải pháp khắc phục (Resolution)
Chúng tôi đã tiến hành cập nhật hai file record DTO trong dự án `shopping-service` để triển khai interface `java.io.Serializable`:
* **`PageResponse.java`** (`codebase/backend/shopping-service/src/main/java/com/mom/shopping/controller/dto/PageResponse.java`):
  ```java
  public record PageResponse<T>(...) implements Serializable { }
  ```
* **`ShoppingItemResponse.java`** (`codebase/backend/shopping-service/src/main/java/com/mom/shopping/controller/dto/ShoppingItemResponse.java`):
  ```java
  public record ShoppingItemResponse(...) implements Serializable { }
  ```

---

## 2. Lỗi Hiển Thị Text Phân Trang `{start}-{end}` Trên Tổng Số `{total}`
Ở cuối danh sách mua sắm, nhãn phân trang hiển thị dạng text template thô: `Hiển thị {start}-{end} trên tổng số {total} mặt hàng` thay vì hiển thị các con số thực tế.

### A. Nguyên nhân lỗi (Root Cause)
* Thư viện dịch thuật đa ngôn ngữ được sử dụng trên frontend là **`ngx-translate`** của Angular.
* Định dạng nội suy tham số (interpolation parameters) của `ngx-translate` yêu cầu sử dụng **dấu ngoặc nhọn kép** `{{ parameter }}`.
* Tuy nhiên, trong các file JSON dịch thuật con của module Shopping, các tham số này đang được cấu hình bằng dấu ngoặc nhọn đơn `{}` (kiểu i18next hoặc Java MessageFormat), dẫn đến việc thư viện không nhận diện và thay thế được tham số:
  ```json
  "range": "Hiển thị {start}-{end} trên tổng số {total} mặt hàng"
  ```

### B. Giải pháp khắc phục (Resolution)
Chúng tôi đã tiến hành chỉnh sửa các file dịch thuật con theo chuẩn của dự án:
1.  **Cập nhật `vi.json`** (`codebase/frontend/public/i18n/app/shopping/vi.json`):
    ```json
    "range": "Hiển thị {{start}}-{{end}} trên tổng số {{total}} mặt hàng"
    ```
2.  **Cập nhật `en.json`** (`codebase/frontend/public/i18n/app/shopping/en.json`):
    ```json
    "range": "Showing {{start}}-{{end}} of {{total}} items"
    ```
3.  **Đồng bộ hóa i18n**:
    Chạy script compile i18n để đồng bộ và merge các file con vào file dịch tổng của dự án:
    ```bash
    node codebase/scripts/compile-i18n.js
    ```

---

## 3. Quy trình Xác minh & Kết quả (Verification & Results)
1. **Biên dịch & Khởi động Backend**:
   - Biên dịch lại backend thành công: `mvn compile -f codebase/backend/shopping-service/pom.xml`.
   - Giải phóng cổng `8088` bị chiếm và chạy lại dịch vụ `shopping-service`.
2. **Đồng bộ hóa Frontend**:
   - Biên dịch và merge file dịch thuật thành công.
3. **Kết quả kiểm tra trực quan**:
   - API `shopping-items` phản hồi thành công mã **`HTTP 200 (OK)`**.
   - Dòng nhãn phân trang ở góc dưới danh sách hiển thị hoàn hảo: **`Hiển thị 1-10 trên tổng số 25705 mặt hàng`**.
