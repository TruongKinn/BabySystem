# Tài liệu kỹ thuật: Chuẩn hóa Giao diện & Dialog Tỷ giá ngoại tệ (Expense Service UI)

Tài liệu này chi tiết hóa việc tái cấu trúc giao diện trang Quản lý chi tiêu (`/app/expenses`) của hệ thống BabySystem.

---

## 1. Chuẩn hóa Định dạng Ô Nhập liệu (Input Formatting)

Để giải quyết vấn đề các ô nhập liệu chưa đồng bộ định dạng (format) chung của hệ thống, chúng tôi chuyển đổi các điều khiển nhập liệu thô sang các thành phần của thư viện NG-ZORRO (Ant Design Angular).

### 1.1. Bộ chọn tháng (Month Picker)
- **Trước**: Sử dụng `<input type="month">` thô với thẻ bọc CSS tự viết. Thẻ này hiển thị không nhất quán trên các trình duyệt khác nhau và thiếu hiệu ứng tương tác cao cấp.
- **Sau**: Sử dụng `<nz-date-picker nzMode="month">`.
- **Cơ chế chuyển đổi**:
  - Chuyển đổi từ `monthKey` (`string` định dạng `YYYY-MM`) sang `Date` để hiển thị trong Picker:
    ```typescript
    get monthDate(): Date {
      const [year, month] = this.monthKey.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    ```
  - Xử lý khi người dùng chọn tháng mới:
    ```typescript
    onMonthDateChange(date: Date | null): void {
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        this.onMonthChange(`${year}-${month}`);
      }
    }
    ```

### 1.2. Bộ lọc danh mục & Sắp xếp (Category Filter & Sort Mode)
- **Trước**: Sử dụng thẻ `<select class="filter-select">` HTML chuẩn.
- **Sau**: Sử dụng `<nz-select>` của NG-ZORRO với các thiết lập:
  - `nzShowSearch` cho phép tìm kiếm nhanh danh mục.
  - Tích hợp đồng điệu CSS với các class thiết kế tone ấm áp của vai trò User.

### 1.3. Ô tìm kiếm (Search Input)
- **Trước**: Thẻ `<input nz-input>` đứng đơn lẻ.
- **Sau**: Bọc trong `<nz-input-group [nzPrefix]="prefixIconSearch">` với icon `<ng-template #prefixIconSearch><span nz-icon nzType="search"></span></ng-template>`.

---

## 2. Dialog Tỷ giá Ngoại tệ (Exchange Rate Modal)

Nhằm tối ưu hóa diện tích hiển thị của trang chính, toàn bộ khối thông tin tỷ giá sẽ được chuyển vào một Dialog riêng.

### 2.1. Nút kích hoạt mở Dialog
Nút "Xem tỷ giá" được đặt ở góc trên bên phải của màn hình, cạnh các nút hành động Làm mới và Thêm mới chi tiêu:
```html
<button nz-button nzType="default" class="btn-user-outline" (click)="openExchangeRateModal()">
  <span nz-icon nzType="global"></span>
  Xem tỷ giá
</button>
```

### 2.2. Thiết kế Dialog (Modal)
Sử dụng cấu trúc `nz-modal` Premium theo thiết kế của hệ thống:
- Gán lớp `nzClassName="user-role-modal"` để tự động áp dụng theme ấm áp toàn cục (bo góc 20px, backdrop blur, bóng đổ 3 tầng).
- Chiều rộng: `[nzWidth]="680"`.
- Tiêu đề sử dụng template tùy biến với icon badge gradient sang trọng:
  ```html
  <ng-template #exchangeRateTitleTpl>
    <div style="display:flex;align-items:center;gap:12px">
      <span class="modal-title-icon-wrap modal-title-icon-wrap--teal">
        <span nz-icon nzType="global"></span>
      </span>
      <span class="modal-title-text">
        <span class="modal-title-main">Tỷ giá ngoại tệ Vietcombank</span>
        <span class="modal-title-sub">Tính năng Premium: Cập nhật tỷ giá tự động & chuyển đổi tiền tệ</span>
      </span>
    </div>
  </ng-template>
  ```
- Nút footer tùy chỉnh chỉ có nút "Đóng" (Cancel) để tối ưu trải nghiệm đọc thông tin. Form đổi tiền tệ nhanh và bảng chi tiết tỷ giá được đặt trong nội dung chính của modal (`*nzModalContent`).

### 2.3. Form Chuyển đổi tiền tệ nhanh (Quick Convert Form)
Để đảm bảo trải nghiệm Premium UX hoàn mỹ, không tì vết, phần biểu mẫu Quick Convert được cấu trúc tỉ mỉ:
- **Lưới Grid đối xứng 4 cột**: Chia cột tỉ lệ `2fr 1.2fr 2fr auto` có `gap: 12px` và thuộc tính `align-items: stretch` giúp tự động kéo đều tất cả các cột.
- **Thiết kế nhãn cân bằng**: Nút "Đổi" được đặt trong một `.quick-convert-field` cùng với nhãn ẩn (`color: transparent`) tương đương với nhãn "Số tiền", "Tiền tệ" và "Kết quả" của các cột bên cạnh, giúp các nhãn ở trên và các ô điều khiển ở dưới thẳng hàng tăm tắp tuyệt đối.
- **Đồng bộ chiều cao & Bo góc**:
  - Các input và nút "Đổi" được thiết lập chiều cao `38px` và bo góc `8px`.
  - Ô chọn tiền tệ `<nz-select>` được tinh chỉnh bằng `::ng-deep` nhắm thẳng vào `.ant-select-selector` để đạt chính xác chiều cao `38px` và bo góc `8px !important`.
  - Định dạng hiển thị văn bản chọn (ví dụ: chữ `USD`) được căn giữa dọc tuyệt đối bằng cách thiết lập flexbox và `line-height: 36px` cho `.ant-select-selection-item`.

---

## 3. Lợi ích Đạt được
- **Trực quan hơn**: Trang chính chỉ tập trung vào hiển thị số liệu chi tiêu, biểu đồ phân tích và lịch sử giao dịch.
- **Giao diện đẳng cấp (Premium UX)**: Các ô nhập liệu đồng bộ viền bo góc tròn, hiệu ứng chuyển màu và đổ bóng cam-hồng khi rê chuột/nhập liệu.
- **Hiệu năng & Tương thích**: Tận dụng triệt để thư viện Ant Design giúp ứng dụng chạy mượt mà trên mọi thiết bị và độ phân giải màn hình.
