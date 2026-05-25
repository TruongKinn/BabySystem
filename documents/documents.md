# Tài liệu Thiết kế & Nâng cấp UX/UI - Documents Service

Tài liệu này ghi nhận phương án nâng cấp và chi tiết giao diện mới của **Documents Service** thuộc hệ thống BabySystem.

---

## 1. Triết lý Thiết kế (Design Philosophy)

Áp dụng trọn vẹn quy chuẩn thiết kế **Premium Glassmorphism & Bento Layout** tích hợp với bộ nhận diện ấm áp (**Warm Palette**) của vai trò người dùng (User Role).

- **Sự Cao Cấp (Premium First):** Sử dụng các hiệu ứng chiều sâu (blur 12px đến 16px), bóng đổ mịn màng (box-shadow đa tầng), và đường viền siêu mảnh (`1px solid rgba(255, 255, 255, 0.4)`) tạo cảm giác như một mặt kính mờ sang trọng.
- **Sự Sống Động (Alive & Dynamic):** Mọi tương tác của người dùng (hover, focus, click) đều đi kèm với các chuyển tiếp mượt mà (`cubic-bezier(0.4, 0, 0.2, 1)`) từ 200ms đến 300ms. Thêm các hoạt ảnh nổi bật như đám mây bay bổng khi hover qua Dropzone.
- **Bố cục Bento hiện đại:** Tận dụng lưới Bento linh hoạt để sắp xếp các khu vực chức năng khoa học, cân đối, giúp trải nghiệm trực quan hóa tốt nhất.

---

## 2. Chi tiết các thành phần giao diện nâng cấp

### 2.1. Banner Chào mừng (Hero Welcome Banner)
- **Visual:** Sử dụng dải màu gradient cam-hồng ấm áp lộng lẫy (`var(--user-grad-1)`) kết hợp với các bóng tròn mờ trang trí phía sau tạo chiều sâu.
- **Tương tác:** Nút "Tải Excel mẫu" được bọc kính trắng mờ ảo (`rgba(255,255,255,0.2)`) có viền mảnh lấp lánh, tự động phát sáng nhẹ khi hover.

### 2.2. Thanh điều hướng Tab (Bento Pill Tabset)
- **Visual:** Chuyển đổi các tab mặc định thành dạng viên thuốc (Pill) hiện đại, viền mờ bo góc mềm mại.
- **Tương tác:** Tab đang chọn sẽ sáng bừng dải màu gradient thương hiệu, chữ trắng nổi bật, tạo cảm giác sang trọng và phân tách rõ ràng.

### 2.3. Danh sách hồ sơ & tài liệu (Fintech File Cards)
- **Visual:** Mỗi tệp tin hiển thị dưới dạng một chiếc Card Bento bo góc 16px với:
  - **Badge Loại tệp rực rỡ:** PDF (Đỏ ngọc), Word (Lam ngọc), Excel (Lục bảo), Hình ảnh (Cam ấm) với gradient lấp lánh riêng biệt.
  - **Tag phân loại:** Phân loại tệp (ví dụ: "Khai sinh", "Y tế") hiển thị dạng viên thuốc nhỏ xinh xắn với màu nền cực dịu mắt.
- **Tương tác:** Hover vào thẻ sẽ tự động nhô lên nhẹ nhàng (`translateY(-3px)`), bóng đổ tỏa rộng mịn màng, viền sáng cam mờ óng ả. Thanh công cụ thao tác nhanh xuất hiện lịch sự bên dưới.

### 2.4. Khu vực tải lên Premium (Glass Premium Dropzone)
- **Visual:** Sử dụng viền đứt nét mảnh với gradient tím-hồng tinh tế, nền kính mờ dịu mắt.
- **Tương tác:**
  - Hover qua: Viền đứt nét chuyển động xoay vòng nhẹ, nền Dropzone chuyển sang màu ngọc bích nhạt óng ánh.
  - Icon đám mây (`cloud-upload`) có hoạt ảnh bay lên hạ xuống nhẹ nhàng (levitation effect) cực kỳ thư thái và sống động.

### 2.5. Lưới xem trước Excel (Bento Fintech Spreadsheet Sheet)
- **Visual:** Chuyển đổi bảng preview Excel thông thường thành một trang tính Fintech chuyên nghiệp:
  - Header bảng mờ ảo, chữ in đậm gọn gàng.
  - Các ô input chỉnh sửa trực tiếp dạng borderless (không viền) mặc định để bảng trông vô cùng thoáng đạt và sạch sẽ.
- **Tương tác:**
  - Hover vào ô input: Xuất hiện viền cam nhạt cực kỳ thanh mảnh.
  - Focus vào ô input: Ô nhập liệu sáng bừng viền cam đậm kèm hiệu ứng bóng mờ (box-shadow) màu cam ấm áp.
  - Dữ liệu lỗi: Tự động highlight viền đỏ ngọc óng ánh kèm icon cảnh báo tooltip chi tiết.

### 2.6. Trình xem tài liệu & Modals (Premium Interactions Modals)
- **Visual:** Các modal xem tài liệu trực tiếp và modal báo cáo kết quả nhập hàng loạt kế thừa lớp `.user-role-modal`:
  - Backdrop blur mạnh mẽ (blur 14px) che mờ hậu cảnh sang trọng.
  - Khung modal bo góc lớn 20px, bóng đổ 3 tầng sâu thẳm.
  - Kết quả Import được trình bày trong các Bento Card nhỏ xinh xắn màu xanh ngọc (Thành công) và đỏ san hô (Thất bại) bắt mắt.

---

## 3. Quy chuẩn CSS & Kế thừa
- Toàn bộ các định nghĩa CSS được đóng gói gọn gàng bên trong tệp `documents.component.css` sử dụng các biến CSS Custom Properties nội bộ và kế thừa từ hệ thống token toàn cục tại `src/styles.css` để tránh làm ảnh hưởng đến các màn hình khác và loại bỏ hoàn toàn cơ chế Encapsulation lỗi.
- Đảm bảo tuân thủ nghiêm ngặt rule `prefers-reduced-motion` nhằm mang lại sự dễ chịu cho mọi nhóm đối tượng người dùng.
