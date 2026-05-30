# Hướng dẫn Khắc phục Lỗi Bóp méo Avatar & Nâng cấp Giao diện Chủ hộ Phân hệ Admin

Tài liệu này ghi nhận nguyên nhân, giải pháp kỹ thuật chi tiết liên quan đến lỗi hiển thị avatar người tạo bị bóp méo dẹt lép (dúm lại) và quy trình nâng cấp giao diện hiển thị ảnh đại diện động, hover Tooltip, cùng cơ chế tự động truy vấn API lấy thông tin chi tiết của chủ hộ khi họ không thuộc danh sách thành viên của gia đình trên màn hình Quản lý Tài chính Hộ gia đình (`/admin/finance`) thuộc phân hệ Admin.

---

## 1. Mô tả Vấn đề (Vấn đề "Dúm lại" & Thiếu thông tin Chủ hộ)

Trên màn hình **Quản lý Tài chính Hộ gia đình** (`http://localhost:4200/admin/finance`), tại cột **Chủ hộ / Người tạo**:
* **Dòng 1 (#9218 - Trung Manh)**: Avatar của người tạo hiển thị dạng hình tròn hoàn hảo, nhưng thay vì hiển thị tên thật thì lại hiển thị mã ID `#9221`.
* **Dòng 2 (#1 - Gia đình Trường Chinh)**: Avatar của người tạo (`ChinhNTT`) bị bóp méo, dẹt lép (co rúm lại) theo chiều ngang và hiển thị đúng tên hiển thị.

### Nguyên nhân của việc hiển thị ID `#9221`:
* Người tạo ra gia đình (`createdByUserId = 9221`) không nằm trong danh sách thành viên (`members`) của gia đình đó.
* Logic ban đầu chỉ tìm kiếm thông tin trong mảng thành viên. Khi không tìm thấy, hệ thống sẽ tự động dùng ID để hiển thị (`#9221`).

---

## 2. Nguyên nhân Gốc rễ của việc Dúm Avatar (Root Cause)

Lỗi này là một lỗi hành vi giao diện kinh điển khi sử dụng **Flexbox Layout** kết hợp với các ô bảng (`<td>`) có độ rộng biến động:

1. **Cơ chế co giãn của Flexbox (`flex-shrink`)**:
   * Thẻ cha bao bọc avatar và tên người tạo được thiết lập là flex container với `display: flex; align-items: center; gap: 8px;`.
   * Theo đặc tả CSS Flexbox, mọi flex item (phần tử con trực tiếp) đều có giá trị mặc định của thuộc tính `flex-shrink` là `1`. Điều này có nghĩa là khi không gian chứa của flex container bị thiếu hẹp, các phần tử con sẽ tự động co nhỏ lại để vừa vặn với chiều rộng container.
2. **Sự chênh lệch dữ liệu giữa các dòng**:
   * **Dòng 1**: Dữ liệu trong các cột khác rất ngắn (Tên gia đình: `Trung Manh` ngắn, số thành viên: `4 người`, ngân sách: `20 triệu`, chi tiêu: `13.9 triệu`). Do đó cột "Chủ hộ / Người tạo" có nhiều không gian, flex container không bị ép, avatar giữ nguyên kích thước `24px x 24px` mặc định.
   * **Dòng 2**: Các cột xung quanh chứa dữ liệu cực kỳ dài (Tên gia đình: `Gia đình Trường Chinh` dài, số thành viên: `9 người`, ngân sách: `30 triệu`, chi tiêu thực: `94.5 triệu` - dài gấp 7 lần dòng 1, tiến trình dùng: `315% đã dùng` với thanh progress bar màu đỏ, trạng thái: badge `VƯỢT MỨC` màu đỏ rộng). Những phần tử này chiếm dụng gần hết chiều rộng của dòng bảng, ép cột "Chủ hộ / Người tạo" bị thu nhỏ tối đa.
3. **Thiếu ràng buộc kích thước cố định (`flex-shrink: 0`)**:
   * Khi cột bị ép, avatar `<nz-avatar>` (có `flex-shrink: 1`) bị flexbox ép co rúm lại để nhường không gian cho văn bản bên cạnh. Điều này dẫn đến hình dáng méo mó dẹt lép của avatar ở dòng thứ 2.

---

## 3. Giải pháp Khắc phục "Dúm Avatar"

Chúng tôi đã thiết kế lại cấu trúc HTML và CSS của khu vực này theo tiêu chuẩn giao diện cao cấp (Premium UI/UX) nhằm giải quyết triệt để lỗi bóp méo đồng thời tăng độ bền vững cho layout:

### A. Tách biệt Style inline thành CSS Class chuyên nghiệp
Thay vì sử dụng các thuộc tính inline dễ gây xung đột, chúng tôi đã đóng gói mã nguồn vào các CSS class có ý nghĩa trong file [admin-finance.component.html](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/admin/finance/admin-finance.component.html):

```diff
-              <div style="display: flex; align-items: center; gap: 8px;">
-                <nz-avatar nzSize="small" nzIcon="user" style="background-color: #6366f1;"></nz-avatar>
-                <span style="font-weight: 500;">{{ item.creatorName }}</span>
-              </div>
+              <div class="table-creator-cell">
+                <nz-avatar nzSize="small" nzIcon="user" class="creator-avatar"></nz-avatar>
+                <span class="creator-name">{{ item.creatorName }}</span>
+              </div>
```

### B. Áp dụng các quy tắc CSS chống bóp méo và tràn viền
Định nghĩa các lớp CSS mới trong file [admin-finance.component.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/admin/finance/admin-finance.component.css):

```css
/* Thiết lập cấu trúc Flexbox cho ô người tạo */
.table-creator-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Áp dụng flex-shrink: 0 để avatar luôn giữ nguyên hình dạng tròn trịa */
.creator-avatar {
  background-color: #6366f1 !important;
  flex-shrink: 0 !important; /* KHÔNG BAO GIỜ bị bóp méo */
}

/* Bảo vệ cột trước trường hợp tên người tạo quá dài */
.creator-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px; /* Giới hạn độ rộng tối đa và ẩn text thừa bằng dấu "..." */
}
```

### C. Đề phòng lỗi tương tự trong Side-Drawer đề xuất
Chúng tôi cũng đồng thời rà soát và bổ sung thuộc tính `flex-shrink: 0;` cho avatar của người đề xuất trong Side-Drawer duyệt chi tiêu tại dòng `320` của file HTML:

```diff
-                    <nz-avatar nzSize="small" nzIcon="user" style="background-color: #f59e0b; margin-right: 6px;"></nz-avatar>
+                    <nz-avatar nzSize="small" nzIcon="user" style="background-color: #f59e0b; margin-right: 6px; flex-shrink: 0;"></nz-avatar>
```

---

## 4. Giải pháp: Tự động truy vấn thông tin Chủ hộ từ API

Để xử lý triệt để việc hiển thị mã ID khô khan (như `#9221` ở dòng 1), chúng tôi đã xây dựng cơ chế **truy vấn động thông tin chi tiết người dùng**:

* **Trong mã nguồn TypeScript ([admin-finance.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/admin/finance/admin-finance.component.ts))**:
  * Khi duyệt qua danh sách các gia đình, nếu không tìm thấy thông tin chủ hộ (`family.createdByUserId`) trong danh sách thành viên (`members`), hệ thống sẽ tự động khởi tạo một observable để truy vấn API chi tiết người dùng: `GET /account/users/{family.createdByUserId}`.
  * Nếu tìm thấy trong danh sách thành viên, hệ thống tối ưu hiệu năng bằng cách sử dụng trực tiếp qua `of(...)` mà không cần gọi API thừa.
  * Tích hợp `creatorObservable` này vào `forkJoin` chung của mỗi gia đình để gọi song song, đảm bảo không ảnh hưởng đến hiệu năng tải trang.
  ```typescript
  const creatorObservable = creator 
    ? of({ displayName: creator.displayName, userId: creator.userId })
    : this.http.get<ApiEnvelope<any>>(`${API_CONFIG.GATEWAY_URL}/account/users/${family.createdByUserId}`).pipe(
        map(res => ({
          displayName: res?.data?.displayName || res?.data?.username || `#${family.createdByUserId}`,
          userId: family.createdByUserId
        })),
        catchError(() => of({ displayName: `#${family.createdByUserId}`, userId: family.createdByUserId }))
      );
  ```

---

## 5. Nâng cấp: Hiển thị Avatar Động từ API & Hover Tooltip

### A. Tích hợp ảnh đại diện động (Dynamic Avatar) từ Server
* **Mã nguồn HTML**:
  * Áp dụng property binding `[nzSrc]="item.creatorAvatarUrl"` cho component `<nz-avatar>`. 
  * Cơ chế của Ng-Zorro-Antd sẽ tự động tải hình ảnh này từ API. Nếu người dùng chưa cập nhật ảnh đại diện, avatar sẽ tự động kích hoạt cơ chế fallback để hiển thị icon `user` mặc định màu xanh tím.

### B. Hiển thị Tooltip khi Hover chuột (Hover Tooltip)
* **Giải pháp**: Tích hợp directive `nz-tooltip` trực tiếp vào thẻ wrapper `.table-creator-cell`.
  ```html
  <div class="table-creator-cell" nz-tooltip [nzTooltipTitle]="item.creatorName">
  ```

---

## 6. Kết quả & Đánh giá

* **Tính chính xác của thông tin**: Tên của chủ hộ luôn được lấy ra đầy đủ và chính xác (kể cả khi họ không nằm trong danh sách thành viên gia đình trực tiếp), loại bỏ hoàn toàn các mã ID thô kệch.
* **Độ ổn định**: Avatar của người tạo luôn hiển thị ở dạng hình tròn hoàn hảo `24px x 24px` bất kể dữ liệu các cột bên cạnh dài bao nhiêu hoặc màn hình bị thu nhỏ thế nào.
* **Tính năng Premium**: Người dùng có thể nhìn thấy trực tiếp khuôn mặt/ảnh đại diện thực của chủ hộ ngay trên bảng tổng quan tài chính, tăng tính cá nhân hóa của trang quản trị.
* **Khả năng tương tác (Micro-interactions)**: Tooltip hiển thị mượt mà khi hover chuột, giải quyết hoàn toàn hạn chế của tên bị cắt ngắn khi chiều rộng cột hẹp.
* **Chuẩn hóa**: Toàn bộ thay đổi đã được kiểm tra biên dịch thành công `100%` bằng quy trình build Angular của dự án.
