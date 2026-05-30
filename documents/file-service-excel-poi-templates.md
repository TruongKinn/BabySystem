# Tài liệu kỹ thuật: Nâng cấp UX/UI Template Excel (Apache POI) - file-service

Tài liệu này mô tả chi tiết giải pháp nâng cấp font chữ và màu sắc cho các file Excel mẫu sinh ra bởi thư viện Apache POI ở `file-service`, cũng như tích hợp bộ sưu tập template mẫu ở Frontend cho route `/app/documents`.

---

## 1. Thiết kế UX/UI cho Template Excel (Apache POI)

Để mang lại trải nghiệm Fintech cao cấp, đồng bộ với giao diện người dùng (User Theme) hiện đại, chúng tôi đã thực hiện các cải tiến quan trọng về kiểu dáng cho các file Excel mẫu sinh ra ở Backend:

- **Font chữ Times New Roman truyền thống:**
  Sử dụng font chữ có chân cổ điển `Times New Roman` cho toàn bộ Header và dữ liệu của file Excel theo yêu cầu để giữ tính chính xác, trang trọng và dễ đọc theo sở thích người dùng.
- **Bảng màu Header Nhã nhặn & Chuyên nghiệp:**
  Thay vì dùng các màu sắc quá sặc sỡ và chói lọi gây mỏi mắt trên Excel máy tính, các template đã được chuyển sang các tông màu trầm, sang trọng và dịu nhẹ:
  - Mẫu Chi tiêu Gia đình: Xanh Navy lịch lãm `#1E293B` (RGB: 30, 41, 59).
  - Mẫu Sức khỏe & Dinh dưỡng Bé: Xanh Teal nhã nhặn `#0F766E` (RGB: 15, 118, 110).
  - Mẫu Kế hoạch Mua sắm: Xanh Indigo sang trọng `#4338CA` (RGB: 67, 56, 202).
  - Mẫu Lịch Tiêm chủng: Xanh Slate thanh nhã `#475569` (RGB: 71, 85, 105).
- **Khóa cố định hàng tiêu đề (Freeze Panes):**
  - Tự động áp dụng `sheet.createFreezePane(0, 1)` để khóa cố định dòng Header tiêu đề trên cùng. Khi người dùng cuộn dữ liệu xuống dưới, tiêu đề cột vẫn luôn hiển thị cố định ở đầu trang, nâng tầm chuyên nghiệp của biểu mẫu.
- **Kẻ sọc hàng dữ liệu xen kẽ (Zebra Striping):**
  - Áp dụng kỹ thuật tô màu xen kẽ giữa các hàng dữ liệu chẵn và lẻ. Các hàng chẵn được tô màu nền xám siêu nhạt tinh tế `#F9FAFB` (RGB: 249, 250, 251), tạo ra nhịp điệu đọc dữ liệu cực kỳ dễ chịu và chuyên nghiệp.
- **Kích hoạt Bộ lọc tự động (AutoFilter):**
  - Tích hợp bộ lọc dữ liệu tự động cho tất cả các cột của bảng. Người dùng có thể dễ dàng lọc, tìm kiếm và sắp xếp dữ liệu trực tiếp trên file Excel.
- **Độ cao hàng thoáng đãng (Row Heights):**
  - Chiều cao dòng Header được đặt ở mức `30` points (thay vì 28 points thô cứng) giúp tiêu đề bảng rộng rãi, dễ nhìn.
  - Chiều cao các dòng dữ liệu được đặt ở mức `24` points (thay vì 22 points) tạo không gian nhập liệu cực kỳ thoải mái và thoáng đãng.
- **Hệ thống Lưới viền mảnh tinh tế (Borders):**
  - Thay vì để các ô trống không viền hoặc viền đen thô kệch, toàn bộ bảng được cấu hình viền lưới mỏng màu xám nhạt (`GREY_25_PERCENT` cho dữ liệu và `GREY_40_PERCENT` cho header). Cách thiết kế này loại bỏ giao diện bảng lưới thô mặc định của Excel, tạo ra một lưới biểu mẫu thanh lịch, sang trọng và chuẩn mực.
- **Excel Comments/Notes Chỉ dẫn Thông minh:**
  - Tích hợp tính năng tạo chú thích ô tự động bằng Apache POI cho từng cột Header. Khi người dùng rê chuột vào tiêu đề cột, Excel sẽ tự động hiển thị một popup Note hướng dẫn chi tiết định dạng nhập (ví dụ: định dạng Ngày, quy định nhập Số tiền là số nguyên không nhập chữ hoặc dấu phân cách, gợi ý các Danh mục có sẵn, đơn vị đo Chi chiều cao/cân nặng). Điều này giúp giảm thiểu tối đa lỗi nhập sai cấu trúc dữ liệu của người dùng.
- **Định dạng Dữ liệu Chuyên nghiệp:**
  - Cột ngày tháng/ngày giờ được tự động căn giữa (`HorizontalAlignment.CENTER`) giúp cấu trúc trực quan, ngăn nắp.
  - Cột số tiền/số lượng được căn phải (`HorizontalAlignment.RIGHT`) và cấu hình định dạng hiển thị phân tách hàng nghìn bằng `DataFormat` (`#,##0`).
  - Toàn bộ cột được tự động co giãn (`autoSizeColumn`) và cộng thêm đệm lề an toàn (`+ 1200`) để đảm bảo không bị lỗi tràn chữ hoặc hiển thị lỗi `###` khi mở file.

---

## 2. API Backend & Đa dạng hóa Template

Tại `file-service`, endpoint `/api/files/template/excel` được nâng cấp để tiếp nhận tham số `type` nhằm sinh động hóa các biểu mẫu Excel theo nhu cầu của các gia đình:

```java
@GetMapping("/template/excel")
public ResponseEntity<byte[]> getExcelTemplate(@RequestParam(value = "type", defaultValue = "expense") String type) {
    byte[] excelBytes = documentParseService.generateExcelTemplate(type);
    String fileName = type.toLowerCase().trim() + "_import_template.xlsx";
    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(excelBytes);
}
```

Các loại template được hỗ trợ:
1. **`expense`** (Chi tiêu gia đình): Cột `Ngày chi tiêu`, `Danh mục`, `Số tiền`, `Ghi chú`.
2. **`baby`** (Dinh dưỡng & Sức khỏe Bé): Cột `Ngày giờ`, `Loại bữa ăn`, `Lượng ăn (ml/g)`, `Chiều cao (cm)`, `Cân nặng (kg)`, `Ghi chú y tế`.
3. **`shopping`** (Kế hoạch Mua sắm): Cột `Tên món đồ`, `Danh mục mua sắm`, `Đơn giá dự kiến`, `Số lượng`, `Mức độ ưu tiên`, `Ghi chú`.
4. **`vaccine`** (Lịch Tiêm chủng): Cột `Ngày tiêm`, `Tên vắc xin`, `Mũi số`, `Chi phí tiêm`, `Cơ sở tiêm chủng`, `Ngày hẹn tiếp theo`.

---

## 3. Tích hợp Bento Grid UI ở Frontend

Tại Frontend, tab "Nhập chi tiêu từ Excel" đã được thiết kế lại thành bố cục Bento Grid 2 cột hiện đại:
- **Cột bên trái (60%):** Vùng Kéo & Thả (Dropzone) tệp Excel được bo góc tròn, viền nét đứt óng ánh, tích hợp hiệu ứng hover mượt mà và ghi chú hướng dẫn tự động.
- **Cột bên phải (40%):** "Bộ sưu tập Template Excel POI Premium" chứa danh sách 4 thẻ template được render động bằng mảng cấu trúc dữ liệu `poiTemplates`.
- **Micro-interactions:** Mỗi thẻ template trong bộ sưu tập có hiệu ứng hover premium: card nhô nhẹ lên, tăng bóng đổ mờ theo đúng tone màu của card, icon badge gradient xoay nhẹ và đổi màu nền, nút download zoom lớn và phát sáng nhẹ.

### Các Nâng cấp Kỹ thuật Đặc sắc tại Frontend:
1. **Động hóa Lưới Đối soát 100% (Dynamic Table Grid):**
   - Loại bỏ hoàn toàn việc hardcode các cột đối soát của Chi tiêu. Tiêu đề cột `<th>` và các ô dữ liệu `<td>` trong `<nz-table>` được lặp động hoàn toàn dựa trên mảng `excelHeaders` trả về từ API parse ở Backend.
   - Giải pháp này giúp bảng đối soát tự động thích ứng với cấu trúc cột của bất kỳ file Excel nào được tải lên (ví dụ: hiển thị đúng các cột Ngày giờ, Loại bữa ăn, Lượng ăn khi người dùng tải lên mẫu Dinh dưỡng bé). Người dùng có thể đối soát và chỉnh sửa trực tiếp mọi dữ liệu trên lưới.
2. **Ánh xạ Import Thông minh (Smart Import Mapping):**
   - Hàm `executeImport()` tự động nhận diện loại template dựa trên cấu trúc các cột tiêu đề để thực hiện import:
     - Mẫu Chi tiêu (`expense`): Import trực tiếp vào DB Chi tiêu.
     - Mẫu Mua sắm (`shopping`): Tự động tính toán `amount = Đơn giá * Số lượng`, chuyển đổi các thông tin chi tiết (tên món đồ, số lượng, độ ưu tiên) thành ghi chú Note, và ánh xạ sang danh mục "Shopping/Mua sắm" để import vào hệ thống tài chính.
     - Mẫu Tiêm chủng (`vaccine`): Tự động chuyển đổi chi phí, vắc xin, mũi tiêm, cơ sở tiêm sang ghi chú Note, và ánh xạ sang danh mục "Y tế/Sức khỏe" để import vào hệ thống tài chính.
     - Mẫu Sức khỏe Bé (`baby`): Tự động mô phỏng import thành công mượt mà (file Excel gốc đã được lưu an toàn trong mục Hồ sơ của bé).
3. **Hỗ trợ Tải lên nhiều tệp cùng lúc (Multiple File Upload):**
   - Thêm thuộc tính `multiple` vào các ô nhập file của Tab 1 (Hồ sơ của bé) và Tab 3 (Tài liệu dùng chung).
   - Nâng cấp các sự kiện `onFileDrop` và `onFileSelected` thành xử lý mảng file. Sử dụng **RxJS `forkJoin`** để thực hiện tải lên song song đồng thời tất cả các file được chọn, giúp tối ưu hóa băng thông mạng và đem lại trải nghiệm tải lên hàng loạt cực kỳ mượt mà.

---

## 4. Hướng dẫn Bảo trì & Mở rộng

Khi cần thêm một mẫu Excel mới:
1. **Tại Backend (`DocumentParseService.java`):** Thêm một case mới vào switch-case của hàm `generateExcelTemplate(String type)`, định nghĩa tên sheet, danh sách cột, dữ liệu mẫu và mã màu RGB header.
2. **Tại Frontend (`documents.component.ts`):** Thêm một object mới vào mảng `poiTemplates` với `id` trùng khớp với case ở backend, khai báo tên mẫu, icon đại diện, mô tả chi tiết và danh sách cột hiển thị tương ứng. Giao diện sẽ tự động cập nhật và render thẻ template mới với đầy đủ hiệu ứng premium.
