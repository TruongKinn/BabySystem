# Đồng Bộ Hóa Chiều Cao Và Căn Lề Các Phần Tử Trong Modal (Popup)

## 1. Mô tả vấn đề
Trong các modal (popup) của ứng dụng như **Kho Hóa đơn & Chứng từ Chi tiêu** và **Tỷ giá ngoại tệ Vietcombank**, các phần tử điều khiển (control) như ô chọn Dropdown (`nz-select` sử dụng class `user-filter-select`) và ô nhập tìm kiếm (`nz-input-group` sử dụng class `user-search-input-group`) bị hiển thị **lệch chiều cao** (alignment) và không đồng đều.

### Nguyên nhân gốc rễ
1. **Lỗi Selector Class Liên Kết (Chìa khóa lỗi)**: Class custom `user-filter-select` được Angular gán lên thẻ cha `<nz-select>`, trong khi các class `.ant-select` và `.ant-select-selector` lại do thư viện UI Ng-Zorro Antd tự động sinh ra ở các thẻ con `div` bên trong `<nz-select>`. Cấu trúc viết liền trước đó trong CSS global là `.user-filter-select.ant-select` (yêu cầu cả hai class nằm trên cùng một thẻ) đã **không bao giờ khớp**, khiến toàn bộ thuộc tính chiều cao `38px` của dropdown select bị trình duyệt bỏ qua và lùi về mặc định (32px).
2. **Cơ chế Portal của Modal**: Do modal được portal (kết xuất) ra ngoài body của trang (`<body>`), các class CSS cục bộ (local scoped) trong component bị cô lập hoàn toàn, không thể tác động tới các phần tử bên trong modal.
3. **Hiện tượng phình to ô tìm kiếm (Input Height Overflow)**: Ô nhập tìm kiếm có inline style `style="height: 38px;"` trực tiếp trên thẻ `<input nz-input>` con bên trong wrapper `.ant-input-affix-wrapper` (cũng cao 38px). Do border và padding của wrapper cộng dồn, thẻ input con đã kéo dãn làm phình to wrapper lên thành 41px+.
4. **Kết quả lệch kép**: Dropdown select bị lùn (32px), trong khi ô nhập tìm kiếm bị phình to (41px+). Khi xếp chúng cạnh nhau trên cùng một hàng có căn lề dưới (`align-items: end`), ô tìm kiếm nhô cao hơn hẳn, đẩy nhãn (label) "TÌM KIẾM" nhấp nhô cao hơn so với "DANH MỤC" và "SẮP XẾP", tạo cảm giác giao diện rất mất cân đối.

---

## 2. Giải pháp thực hiện

### A. Chuẩn hóa CSS Toàn cục (Global CSS)
Chúng tôi đã chuyển toàn bộ CSS tùy chỉnh từ local component sang file CSS toàn cục và sửa đổi các selector lỏng lẻo hơn (sử dụng khoảng trắng kế thừa) để đảm bảo khớp 100% với cấu trúc render DOM của Ng-Zorro:

1. **Cập nhật CSS toàn cục** ([styles.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/styles.css)):
   - Sửa đổi selector `.user-filter-select.ant-select` thành các selector bao phủ hơn: `.user-filter-select .ant-select-selector` và `.user-filter-select.ant-select .ant-select-selector` để đảm bảo tác động chính xác lên thẻ con bất kể class cha nằm ở đâu.
   - Thêm định dạng line-height cho text bên trong select để chữ luôn nằm chính giữa ô 38px:
     ```css
     .user-filter-select .ant-select-selection-item,
     .user-filter-select .ant-select-selection-placeholder {
         line-height: 35px !important;
     }
     ```
   - Thêm quy tắc khống chế chiều cao cho thẻ input bên trong wrapper của ô tìm kiếm để nó luôn khít khao và không làm phình to wrapper:
     ```css
     .user-search-input-group.ant-input-affix-wrapper input.ant-input {
         height: 100% !important;
         background: transparent !important;
         border: none !important;
         padding: 0 !important;
         color: var(--text-main) !important;
     }
     ```

2. **Xóa CSS cục bộ** ([expenses.component.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.css)):
   - Loại bỏ hoàn toàn các định nghĩa cục bộ trùng lặp để tránh xung đột độ ưu tiên.

### B. Loại bỏ Inline Style dư thừa
* File [expenses.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/expenses/expenses.component.html): 
  - Loại bỏ inline style `style="height: 38px; border-radius: 8px;"` trên thẻ `<input nz-input>` của ô tìm kiếm.
  - Thẻ input bây giờ sẽ kế thừa chiều cao `100%` khít khao của wrapper thông qua CSS global, đảm bảo wrapper `.ant-input-affix-wrapper` giữ chiều cao chính xác tuyệt đối là **38px** (không bị phình to).

---

## 3. Kết quả đạt được
* **Canh lề hoàn hảo, tăm tắp**: 
  * Cả 3 phần tử (Danh mục, Tìm kiếm, Sắp xếp) đều có chiều cao chính xác tuyệt đối là **38px** (không lệch dù chỉ 1px).
  * Mép trên và mép dưới của cả 3 ô nằm trên một đường thẳng hoàn hảo.
  * Các label ("DANH MỤC", "TÌM KIẾM", "SẮP XẾP") thẳng hàng ngang tăm tắp cực kỳ đẹp mắt.
* **Đồng bộ hóa Modal Tỷ giá**: Biểu mẫu chuyển đổi tiền tệ nhanh trong **Tỷ giá ngoại tệ Vietcombank** cũng áp dụng thành công chiều cao 38px cho ô chọn ngoại tệ, giúp hàng biểu mẫu chuyển đổi trở nên liền mạch và cao cấp theo đúng chuẩn FinTech.
* **Tối ưu hóa mã nguồn**: Không còn inline-style dư thừa, giao diện gọn nhẹ, khả năng bảo trì và tái sử dụng rất cao cho các modal/popup phát triển sau này.
