# Phân hệ Nhập Excel - Báo cáo Nhập đơn lẻ & Nhập hàng loạt (frontend-service)

Tài liệu này mô tả chi tiết kiến trúc thiết kế, giao diện người dùng và cơ chế báo cáo phân tách rõ ràng giữa chế độ **Nhập đơn lẻ (Single Import)** và **Nhập hàng loạt (Bulk Import)** cho các tệp Excel chứa dữ liệu sinh hoạt của trẻ (Chi tiêu, Mua sắm, Tiêm chủng, Sức khỏe).

---

## 1. Thiết kế Giao diện & Trải nghiệm Người dùng (Premium Bento UI)

Để đảm bảo tính nhất quán với quy chuẩn **Web Design Backbone**, phân hệ Nhập dữ liệu từ Excel áp dụng phong cách thiết kế **Glassmorphism hiện đại** kết hợp với các hiệu ứng chuyển động mượt mà (micro-interactions):
* **Excel Selector Carousel**: Thanh trượt ngang chứa danh sách các tệp Excel đã tải lên và phân tích cú pháp. Mỗi tệp được biểu diễn bằng một thẻ **Bento Pill** trực quan, hiển thị tên tệp, biểu tượng Excel, số dòng dữ liệu và trạng thái đã nhập (imported).
* **Spreadsheet Grid**: Một lưới tương tác trực tiếp cho phép người dùng xem trước, chỉnh sửa dữ liệu của tệp Excel đang được chọn trước khi lưu chính thức vào cơ sở dữ liệu.
* **Hệ thống Nút điều hướng rõ ràng**:
  * **Nhập tệp này (Đơn)**: Chỉ thực hiện xử lý và lưu tệp Excel đang hiển thị trên Spreadsheet Grid.
  * **Nhập hàng loạt (Tất cả)**: Tự động chạy tiến trình song song để lưu tất cả các tệp Excel chưa được lưu trong danh sách Carousel.

---

## 2. Cơ chế Báo cáo Kết quả Phân tách

Hệ thống cung cấp hai loại modal báo cáo riêng biệt để phù hợp hoàn toàn với ngữ cảnh sử dụng của người dùng:

### A. Báo cáo kết quả Nhập đơn (Single Import Report)
* **Khi nào kích hoạt**: Khi người dùng nhấn nút "Nhập tệp này (Đơn)".
* **Thông tin hiển thị**:
  1. **Bento Badge nhận diện tệp**: Một khối kính mờ (Teal gradient) hiển thị biểu tượng Excel và tên tệp Excel vừa được nhập để người dùng không bị lẫn lộn dữ liệu giữa các tệp.
  2. **Kết quả đếm dòng**: 2 thẻ màu lớn nổi bật hiển thị số lượng dòng thành công (màu xanh lá) và số lượng dòng thất bại (màu đỏ).
  3. **Nhật ký lỗi chi tiết**: Nếu có lỗi phát sinh, modal sẽ hiển thị danh sách dạng scroll mượt mà ghi rõ dòng thứ mấy trong file bị lỗi cùng lý do chi tiết từ máy chủ.

### B. Báo cáo tổng hợp kết quả Nhập hàng loạt (Bulk Import Report)
* **Khi nào kích hoạt**: Khi người dùng nhấn nút "Nhập hàng loạt (Tất cả)".
* **Thông tin hiển thị**:
  * Tiêu đề lớn: **Báo cáo tổng hợp kết quả Nhập hàng loạt** kèm gradient màu lục bảo (Emerald).
  * Mô tả chung về tiến trình chạy bất đồng bộ song song.
  * **Danh sách kết quả theo từng File (File-by-File Status)**: Lặp qua từng file trong danh sách gửi lên và hiển thị một thẻ Bento riêng biệt cho file đó, bao gồm:
    - Tên file đang xử lý.
    - Badges đếm số dòng thành công và số dòng thất bại của riêng tệp đó.
    - Trạng thái hoàn thành nhanh (All Success Badge) nếu tệp đó hoàn toàn không có lỗi.
    - Nhật ký các dòng lỗi chi tiết của riêng tệp đó (nếu có).

---

## 3. Kiến trúc Luồng Dữ liệu & Xử lý lỗi (TypeScript)

### A. Xử lý Nhập đơn lẻ
Phương thức `executeSingleImport()` lấy tệp Excel hiện tại từ chỉ mục `selectedExcelFileIndex` và phát động API lưu trữ tương ứng với loại dữ liệu của tệp. Kết quả trả về của backend được gán trực tiếp kèm theo thuộc tính tên tệp:
```typescript
this.importResult = { ...res, fileName: fileItem.fileName };
this.showImportResultModal = true;
```

### B. Xử lý Nhập hàng loạt
Phương thức `executeBulkImport()` sử dụng RxJS `forkJoin` để kích hoạt đồng thời các API import của toàn bộ các file chưa được lưu. 
Để ngăn chặn tình trạng một file bị lỗi HTTP khiến cho toàn bộ tiến trình `forkJoin` bị hủy bỏ (fail-fast), mỗi Observable API của từng file được bọc bên trong một Wrapper thông minh tự động bắt lỗi riêng lẻ và trả về thông tin lỗi dưới cấu trúc chuẩn:
```typescript
return new Observable<any>(observer => {
  obs$.subscribe({
    next: (res: any) => {
      observer.next({
        fileName: fileItem.fileName,
        successCount: res.successCount,
        failedCount: res.failedCount,
        errors: res.errors
      });
      observer.complete();
    },
    error: (err: any) => {
      observer.next({
        fileName: fileItem.fileName,
        successCount: 0,
        failedCount: payload.length,
        errors: [{ index: -1, reason: err.message || 'Lỗi hệ thống hoặc định dạng' }]
      });
      observer.complete();
    }
  });
});
```

Sau khi `forkJoin` hoàn thành, toàn bộ mảng kết quả `results` được gán vào `bulkImportResults` để hiển thị đồng bộ lên `showBulkImportResultModal`.

---

## 4. Tóm tắt các File được nâng cấp

* `frontend/src/app/documents/documents.component.ts`: Cập nhật logic thu thập và liên kết `fileName` vào biến `importResult` phục vụ hiển thị báo cáo Nhập đơn.
* `frontend/src/app/documents/documents.component.html`: 
  - Điều chỉnh tiêu đề tĩnh của modal Nhập đơn thành "Báo cáo kết quả Nhập đơn".
  - Thêm thẻ hiển thị thông tin tên tệp vừa thực hiện Nhập đơn trên giao diện.
