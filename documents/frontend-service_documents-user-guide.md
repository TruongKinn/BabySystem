# Hướng dẫn Sử dụng: Phân hệ Quản lý Tài liệu & Nhập liệu thông minh (Documents Hub)

Chào mừng bạn đến với phân hệ **Documents Hub & Smart Import** tại đường dẫn `http://localhost:4200/app/documents`. Đây là trung tâm quản lý tài liệu gia đình kết hợp công nghệ nhập liệu thông minh từ tệp Excel của **BabySystem**.

---

## 🌟 Tổng quan giao diện (Bento Hub Design)

Màn hình được thiết kế theo phong cách **Bento Grid** hiện đại với banner chào mừng chuyển màu gradient cam-hồng ấm áp. Giao diện được chia thành **3 Tab tính năng cốt lõi** phục vụ các nhu cầu quản lý khác nhau:

```
┌────────────────────────────────────────────────────────┐
│               Welcome Banner (Tải Excel mẫu)           │
├────────────────────────────────────────────────────────┤
│  [Tab 1: Tài liệu bé] [Tab 2: Nhập Excel] [Tab 3: Chung]│
├────────────────────────────────────────────────────────┤
│                                                        │
│                  Khu vực nội dung Tab                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Hướng dẫn chi tiết từng Tab tính năng

### 👶 TAB 1: Tài liệu & Hồ sơ của bé (Baby Documents)
Dành riêng để lưu trữ và xem trực tiếp các giấy tờ tùy thân của từng bé (Giấy khai sinh, sổ tiêm chủng, thẻ bảo hiểm...).

*   **Bước 1: Chọn em bé**
    *   Sử dụng dropdown chọn bé ở góc trái để lọc tài liệu theo từng thành viên.
*   **Bước 2: Tải lên tài liệu (Upload)**
    *   Kéo thả tệp tin của bạn (định dạng PDF, Word `.docx`, hoặc các file Ảnh `.png`, `.jpg`) vào khung **Drag & Drop** đứt nét ở bên phải.
    *   Hệ thống sẽ tải tệp lên hệ thống lưu trữ đám mây MinIO và hiển thị tức thời trong danh sách Bento Card.
*   **Bước 3: Xem trực tiếp (Inline Viewer)**
    *   Click trực tiếp vào tên file trong danh sách. Một trình xem tài liệu (Inline Iframe Viewer) sẽ hiển thị ngay trên giao diện giúp bạn đọc file PDF/Ảnh cực kỳ mượt mà mà không cần tải tệp về máy!

---

### 📊 TAB 2: Nhập chi tiêu thông minh từ Excel (Expense Smart Import)
Giải pháp nhập hàng loạt hàng chục, hàng trăm khoản chi tiêu gia đình từ tệp Excel vào sổ tài chính chỉ trong vài giây.

*   **Bước 1: Tải tệp Excel mẫu**
    *   Nhấn nút **"Tải Excel mẫu"** ở góc phải trên cùng của Banner.
    *   Mở tệp `expense_import_template.xlsx` vừa tải về (được định dạng font chữ **Times New Roman** tiêu chuẩn, viền ô sắc nét và màu cam thương hiệu chuyên nghiệp).
*   **Bước 2: Điền thông tin chi tiêu của bạn**
    *   Nhập các khoản chi tiêu vào file Excel theo cấu trúc cột mẫu:
        *   `Ngày chi tiêu`: Định dạng `YYYY-MM-DD` (Ví dụ: `2026-05-20`).
        *   `Danh mục`: Tên danh mục (Ví dụ: `Meals`, `Shopping`, `Education`, `Medical`, `Others`).
        *   `Số tiền`: Nhập số nguyên (Ví dụ: `150000`).
        *   `Ghi chú`: Mô tả khoản chi.
*   **Bước 3: Tải lên và Xem trước (Spreadsheet Preview)**
    *   Kéo thả tệp Excel đã điền dữ liệu của bạn vào khu vực Dropzone.
    *   Hệ thống sẽ ngay lập tức parse dữ liệu và hiển thị lên một **bảng tính tương tác (Spreadsheet Bento Table)**.
*   **Bước 4: Chỉnh sửa trực tiếp & Tích chọn**
    *   Nếu phát hiện sai sót, bạn có thể **click và sửa trực tiếp** các ô dữ liệu (ngày, số tiền, ghi chú) ngay trên bảng giao diện trước khi import.
    *   Tích chọn vào các hàng bạn muốn nhập vào hệ thống ở cột đầu tiên (hoặc tích chọn tất cả ở Header).
*   **Bước 5: Nhập dữ liệu hàng loạt (Import)**
    *   Nhấn nút **"Nhập dữ liệu hàng loạt"** màu cam ở bên dưới.
    *   Hệ thống sẽ tự động đồng bộ và lưu toàn bộ giao dịch vào cơ sở dữ liệu tài chính. Giao dịch sẽ lập tức xuất hiện tại màn hình quản lý tài chính `/app/expenses` của gia đình!

---

## 🏛️ TAB 3: Tài liệu dùng chung của Gia đình (Family Documents)
Nơi lưu trữ tất cả các tài liệu chung của gia đình như hợp đồng thuê nhà, hóa đơn điện nước, hóa đơn mua sắm lớn...

*   Giao diện hoạt động hoàn toàn tương tự như **Tab 1** (hỗ trợ kéo thả upload và click xem trực tiếp), giúp gia đình có một kho lưu trữ số tập trung, an toàn và dễ truy cập.

---

## 💡 Mẹo nhỏ và Lưu ý quan trọng
1.  **Định dạng file hỗ trợ:** PDF, DOCX (Word), PNG, JPG, JPEG (Ảnh), XLSX (Excel).
2.  **Bảo mật IAM:** Hệ thống tự động cách ly dữ liệu gia đình. Tài liệu và chi tiêu của gia đình bạn sẽ hoàn toàn được bảo mật và chỉ các thành viên được cấp quyền trong gia đình mới có thể xem hoặc chỉnh sửa.
3.  **Tải lại file mẫu:** Mỗi khi backend cập nhật danh mục hoặc cấu trúc, tệp mẫu Excel sẽ tự động đồng bộ từ backend (sinh bởi Apache POI) nên bạn hãy luôn tải file mẫu mới nhất khi thực hiện import lớn!
