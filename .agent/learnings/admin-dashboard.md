# Admin Dashboard

> Tổng hợp kiến thức về việc xây dựng, sửa lỗi và vận hành trang Admin Dashboard trong dự án.
> Cập nhật lần cuối: 2026-05-19

---

## Architecture

### Quản lý số liệu tổng quan hệ thống thông qua ForkJoin
- **Ngày**: 2026-05-19
- **Chi tiết**: Sử dụng `forkJoin` của RxJS để thực hiện đồng thời các request lấy danh sách người dùng (`/auth/account/user/list`), thông tin gia đình (`/account/admin/families`), và phân quyền vai trò (`/auth/roles/workspace`). Điều này giúp tối ưu hóa hiệu năng, giảm thời gian chờ của người dùng và đồng bộ hóa dữ liệu hiển thị trên các Metric Cards và biểu đồ của Admin Dashboard.
- **Files liên quan**: `src/app/admin/dashboard/admin-dashboard.component.ts`

---

## Bugs & Solutions

### Lỗi không hiển thị dữ liệu "Tài khoản khóa gần đây" và sai lệch chỉ số do định dạng Case-Sensitive của trạng thái
- **Ngày**: 2026-05-19
- **Vấn đề**: Số liệu "Tài khoản bị khóa", danh sách "Tài khoản khóa gần đây" hiển thị trống rỗng (empty) mặc dù có dữ liệu bị khóa trong hệ thống.
- **Root cause**: Ở backend, enum `UserStatus` có thuộc tính `@JsonValue` trả về giá trị trạng thái viết thường (lowercase) như `"active"`, `"locked"`, `"inactive"`. Trong khi đó, frontend `admin-dashboard.component.ts` lại so sánh cứng dạng viết hoa: `item.status === 'LOCKED'`. Sự bất đồng bộ chữ hoa/thường này khiến filter trả về rỗng.
- **Fix**: 
  1. Thay đổi kiểu `status` của `AdminUser` từ enum type `UserStatus` thành `string` để linh hoạt với dữ liệu runtime.
  2. Viết hàm helper `normalizeUserStatus(status)` thực hiện `(status ?? '').trim().toUpperCase()` và cập nhật tất cả bộ lọc trạng thái sử dụng helper này để so sánh không phân biệt chữ hoa/thường.
- **Files liên quan**: `src/app/admin/dashboard/admin-dashboard.component.ts`

---

## How-To

### Đồng bộ hóa và hiển thị danh sách Tài khoản bị khóa gần đây
- **Ngày**: 2026-05-19
- **Bước thực hiện**:
  1. Fetch danh sách người dùng với size lớn từ API `/auth/account/user/list`.
  2. Lọc ra các bản ghi có trạng thái bị khóa sử dụng hàm chuẩn hóa: `.filter((item) => this.normalizeUserStatus(item.status) === 'LOCKED')`.
  3. Sắp xếp theo ID giảm dần để đưa các tài khoản bị khóa gần đây nhất lên đầu: `.sort((left, right) => right.id - left.id)`.
  4. Cắt lấy 6 bản ghi đầu tiên để hiển thị bản xem trước: `.slice(0, 6)`.
- **Files liên quan**: `src/app/admin/dashboard/admin-dashboard.component.ts`, `src/app/admin/dashboard/admin-dashboard.component.html`

### Tích hợp Bento Modal chi tiết người dùng và API Mở khóa trực tiếp từ Dashboard
- **Ngày**: 2026-05-19
- **Bước thực hiện**:
  1. Tiêm `NzModalService` và `NzMessageService` vào Dashboard component.
  2. Xây dựng hàm `unlockUser(user)` gọi API status PATCH để chuyển sang hoạt động. Sau đó hiển thị thông báo thành công và gọi `loadSummary()` để đồng bộ tất cả chỉ số.
  3. Xây dựng hàm `openUserDetailModal(user)` bọc dữ liệu và mở `AdminUserDetailModalComponent` với kích thước bento (`90vw` và max-width `1300px`), tự động làm mới số liệu sau khi đóng modal.
- **Files liên quan**: `src/app/admin/dashboard/admin-dashboard.component.ts`, `src/app/admin/dashboard/admin-dashboard.component.html`

---

## Patterns

### Normalization Pattern cho các trường Enum từ Backend
- **Ngày**: 2026-05-19
- **Chi tiết**: Luôn áp dụng một hàm chuẩn hóa `normalize` (ví dụ: `normalizeUserStatus`) trước khi so sánh bất kỳ trường trạng thái hoặc vai trò (enum) nào nhận về từ backend. Điều này bảo vệ frontend khỏi lỗi do sự thay đổi định dạng chữ hoa/thường hoặc thay đổi cấu hình `@JsonValue` ở backend.
- **Files liên quan**: `src/app/admin/dashboard/admin-dashboard.component.ts`

### Premium CSS Grid Action Tiles với Interactive Hover và Accent Borders
- **Ngày**: 2026-05-19
- **Chi tiết**: Thay vì sử dụng các nút inline pill đơn điệu, thiết kế một grid ô gạch CSS Grid (`action-tile`) trực quan, mỗi ô có biểu tượng ý nghĩa, mô tả ngắn, viền bên trái là gradient màu accent đặc trưng. Khi hover, áp dụng dịch chuyển `translateY(-4px)`, đổi màu biểu tượng và tỏa ánh hào quang box-shadow nhẹ nhàng, đem lại cảm giác sang trọng kiểu Stripe/Linear.
- **Files liên quan**: `src/app/admin/dashboard/admin-dashboard.component.html`, `src/app/admin/dashboard/admin-dashboard.component.css`
