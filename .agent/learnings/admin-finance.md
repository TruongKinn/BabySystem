# Admin Finance Workspace

> Tổng hợp kiến thức về xây dựng Phân hệ Quản trị Tài chính Gia đình và cơ chế bỏ qua cô lập dữ liệu (Bypass Data Isolation) cho tài khoản quản trị.
> Cập nhật lần cuối: 2026-05-19

---

## Architecture

### Cơ chế Lọc Quyền và Bypass Data Isolation cho Admin
- **Ngày**: 2026-05-19
- **Chi tiết**: Để Quản trị viên (`ADMIN`/`OWNER`) có thể xem báo cáo tài chính của mọi hộ gia đình trong hệ thống mà không thuộc về các gia đình đó, hệ thống áp dụng cơ chế truyền tin bảo mật như sau:
  1. **Gateway (`ApiPermissionFilter`)** xác thực token, gán thêm Header `X-User-Admin = true/false` chuyển tiếp đi kèm `X-User-Id` và `X-Family-Ids`.
  2. **Thư viện chung (`common-lib`)** nâng cấp `UserContext` ThreadLocal để lưu trữ cờ `admin`.
  3. **Interceptor (`UserContextInterceptor`)** trích xuất Header `X-User-Admin` và lưu vào `UserContext`.
  4. **Data Isolation (`DataIsolationUtil`)** tự động bỏ qua kiểm tra thành viên gia đình (`validateFamilyAccess`) nếu `UserContext.isAdmin() == true`.
- **Files liên quan**: 
  - `ApiPermissionFilter.java`
  - `UserContext.java`
  - `UserContextInterceptor.java`
  - `DataIsolationUtil.java`

---

## Bugs & Solutions

### Lỗi Lệch Cache Chỉ mục (Index Cache Sync) của IDE
- **Ngày**: 2026-05-19
- **Vấn đề**: IDE báo lỗi biên dịch giả `cannot find symbol class JwtService` mặc dù import đúng và cấu hình package chính xác.
- **Root cause**: IDE không tự động đồng bộ hóa đường dẫn nguồn mới biên dịch (source directories) được sinh ra từ compiler hoặc các thay đổi cấu trúc classpath.
- **Fix**: Maven build thành công tuyệt đối trên CLI. Trong IDE (IntelliJ IDEA/Eclipse), tiến hành **Reload Maven Project** hoặc **Invalidate Caches & Restart** để giải quyết triệt để.
- **Files liên quan**: `VerifyServiceImpl.java`

### Lỗi 403 Forbidden khi Admin truy vấn dữ liệu Hộ gia đình khác
- **Ngày**: 2026-05-19
- **Vấn đề**: Gọi `GET /expense/budgets` và `/expense/expenses/summary` bị chặn 403 Forbidden từ `expense-service` khi Admin xem chi tiết của các gia đình khác.
- **Root cause**: Lớp `DataIsolationUtil` của dịch vụ `expense-service` kiểm tra xem `familyId` truyền lên có nằm trong danh sách `familyIds` mà người dùng hiện tại tham gia hay không, dẫn đến việc Admin bị chặn vì không thuộc về gia đình đó.
- **Fix**: Bổ sung cơ chế truyền cờ Admin từ Gateway xuống Microservice thông qua Header `X-User-Admin` và bypass kiểm tra thành viên trong `DataIsolationUtil` khi cờ này có giá trị `true`.
- **Files liên quan**: `DataIsolationUtil.java`, `UserContextInterceptor.java`, `ApiPermissionFilter.java`

### Lỗi Trống Trơn Side-Drawer Thất bại Render trên Angular (Ng-Zorro-Antd)
- **Ngày**: 2026-05-19
- **Vấn đề**: Drawer tài chính mở ra hoàn toàn trống trơn mặc dù dữ liệu đã được gán và tiêu đề Drawer hiển thị chính xác.
- **Root cause**: Trong `nz-drawer` của Ng-Zorro-Antd, nếu khai báo nội dung Drawer một cách thông thường (eager rendering) khi `selectedFamily` ban đầu là `null`, Angular sẽ không kích hoạt vẽ lại (change detection) phần giao diện con bên trong khi `selectedFamily` được cập nhật muộn (do bất đồng bộ và lifecycle của Angular).
- **Fix**: Sử dụng directive `<ng-container *nzDrawerContent>` để chuyển nội dung Drawer thành **lazy rendering**. Điều này đảm bảo toàn bộ DOM và dữ liệu con chỉ được khởi tạo và biên dịch chính xác tại thời điểm người dùng nhấn mở Drawer và dữ liệu `selectedFamily` đã sẵn sàng 100%. Đồng thời, thay thế phép toán phức tạp `Math.round` trực tiếp ở template bằng helper method `getPercent` trên component class để tránh lỗi Type-checking AOT.
- **Files liên quan**: `admin-finance.component.html`, `admin-finance.component.ts`

---

## How-To

### Cách Tích hợp Widget Bento UI tổng hợp từ Đa Dịch vụ
- **Ngày**: 2026-05-19
- **Bước thực hiện**:
  1. Sử dụng **RxJS `forkJoin`** ở Angular frontend để phát động song song 3 API đến Gateway để tối ưu hiệu năng:
     - `GET /expense/budgets?familyId={id}`
     - `GET /expense/expenses/summary?familyId={id}&month={month}`
     - `GET /expense/expenses?familyId={id}&month={month}`
  2. Map kết quả trả về thành cấu trúc đối tượng duy nhất (`FamilyFinance`) để lưu trạng thái.
  3. Lồng ghép thanh tiến độ sử dụng ngân sách lồng (inline Progress Bar) với màu chuyển động (gradient) để tối ưu trực giác người dùng.
- **Files liên quan**: `admin-finance.component.ts`, `admin-finance.component.html`

---

## Patterns

### Phong cách Thiết kế Premium Side-Drawer (Glassmorphism & Micro-animations)
- **Ngày**: 2026-05-19
- **Chi tiết**: Sử dụng cấu trúc Drawer trượt mịn màng để hiển thị thông tin chuyên sâu của một hộ gia đình:
  - Hiệu ứng phông nền kính mờ (`backdrop-filter: blur(16px)` kết hợp viền mờ `border-left: 1px solid rgba(255,255,255,0.1)`).
  - Tích hợp thanh cuộn tùy biến (`::-webkit-scrollbar` mỏng và bo tròn góc) giúp hiển thị nhật ký giao dịch rất lịch lãm.
  - Hover micro-interactions nâng nhẹ thẻ giao dịch và tăng độ tương phản.
- **Files liên quan**: `admin-finance.component.html`, `styles.css`

### Đồng bộ phong cách UX/UI Admin Cao cấp (Space Grotesk & Radial Gradients & Glow Hover)
- **Ngày**: 2026-05-19
- **Chi tiết**: Để giữ tính đồng bộ thiết kế toàn hệ thống, toàn bộ giao diện quản trị phân hệ tài chính được chuẩn hóa theo quy chuẩn Admin:
  - Font chữ chủ đạo `Space Grotesk` kết hợp `Inter`.
  - Hero Card áp dụng tổ hợp radial-gradients & linear-gradients tinh tế tạo chiều sâu thị giác.
  - Các thẻ KPI (Metric cards) áp dụng hiệu ứng phản hồi hover phát quang đa sắc riêng biệt (Xanh dương cho team, Xanh lá cho ngân sách, Cam/Hồng cho chi tiêu, Tím cho tỷ lệ).
  - Trạng thái chi tiêu cảnh báo sử dụng hiệu ứng nhấp nháy chuyển động (`pulse-red`/`pulse-orange`) để gia tăng khả năng chú ý trực giác của Quản trị viên.
- **Files liên quan**: `admin-finance.component.html`, `admin-finance.component.css`
