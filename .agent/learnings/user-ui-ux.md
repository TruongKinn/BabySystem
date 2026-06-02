# User UI/UX & Modal Design System

> Tổng hợp kiến thức về hệ thống giao diện và chuẩn hóa nút bấm, popup cho vai trò User trong dự án.
> Cập nhật lần cuối: 2026-06-02

---

## Architecture

### Centralized User Theme (Warm Palette)
- **Ngày**: 2026-05-18
- **Chi tiết**: Để tránh sự rời rạc và khắc phục hoàn toàn cơ chế Angular View Encapsulation (vốn cô lập CSS ở cấp Component khiến việc kế thừa khó khăn), chúng tôi thiết lập hệ thống Design Tokens và Class chuẩn hóa toàn cục tại `src/styles.css`. Việc xóa bỏ CSS cục bộ dư thừa giúp giảm dung lượng bundle và đảm bảo tính đồng bộ tuyệt đối trong việc hiển thị.
- **Files liên quan**: `codebase/frontend/src/styles.css`

---

## Bugs & Solutions

### Misaligned Cancel Button in Modal Footer
- **Ngày**: 2026-05-18
- **Vấn đề**: Nút "Hủy" (Cancel) trong footer mặc định của `nz-modal` bị lệch chiều cao (chỉ cao 32px so với 38px của nút Lưu) và hiển thị viền xám đen nhợt nhạt, không ăn theo style viền cam chuẩn.
- **Root cause**: Bộ chọn CSS cũ sử dụng `.user-role-modal .ant-modal-footer .ant-btn-default`. Tuy nhiên, thư viện NG-ZORRO (Ant Design) khi kết xuất chỉ gán class `.ant-btn` mà không gán class `.ant-btn-default` cho nút Hủy mặc định trong modal footer.
- **Fix**: Sử dụng bộ chọn phủ định thông minh `.user-role-modal .ant-modal-footer .ant-btn:not(.ant-btn-primary)` để tóm trọn nút Hủy, từ đó gán đúng chiều cao 38px, viền cam `1.5px solid var(--user-primary)`, chữ cam, nền trong suốt và hiệu ứng hover đồng điệu.
- **Files liên quan**: `codebase/frontend/src/styles.css`

### OTP/2FA Multiple Input Focus Leap Bug
- **Ngày**: 2026-05-25
- **Vấn đề**: Khi nhập mã OTP/2FA chia làm nhiều ô input độc lập, focus nhảy không chính xác hoặc ký tự bị nhập đè sang 2 ô liên tiếp (gõ 1 số nhưng điền cả 2 ô liền nhau).
- **Root cause**: Cả 2 sự kiện `keydown` và `input` cùng xử lý việc chèn giá trị và nhảy focus. Khi người dùng gõ phím số, sự kiện `keydown` chặn mặc định (`preventDefault`) và chuyển focus bằng `setTimeout` sang ô tiếp theo rất nhanh. Do focus đổi trước khi chu kỳ xử lý phím của trình duyệt hoàn tất, trình duyệt sẽ gửi sự kiện chèn ký tự thực tế tiếp theo lên ô mới được focus, dẫn đến rò rỉ ký tự sang ô kế tiếp.
- **Fix**: Loại bỏ logic xử lý phím số trong sự kiện `keydown` (`onOtpKeyDown`). Sử dụng sự kiện `input` (`onOtpInput`) làm nơi duy nhất lọc giá trị và quản lý di chuyển focus. Đặc biệt, sử dụng `@ViewChildren('otpInput')` và `QueryList<ElementRef<HTMLInputElement>>` để truy cập các phần tử Native DOM một cách đúng chuẩn Angular, kết hợp với `setTimeout` (10ms) để dời việc chuyển focus ra khỏi luồng sự kiện hiện tại của trình duyệt, ngăn chặn triệt để hiện tượng rò rỉ ký tự phím bấm sang ô tiếp theo.
- **Files liên quan**: `codebase/frontend/src/app/profile/profile.component.ts`, `codebase/frontend/src/app/profile/profile.component.html`

### Misaligned Expenses Filter Input & Select
- **Ngày**: 2026-06-02
- **Vấn đề**: Ô Tìm kiếm (input) bị lệch lên cao (khoảng 6px) so với hai ô ng-select Danh mục và Sắp xếp trong bộ lọc Chi tiêu.
- **Root cause**: CSS định nghĩa lớp `.user-search-input-group.ant-input-affix-wrapper` (liên kết không có khoảng trắng). Thực tế Ng-Zorro render lớp `.user-search-input-group` trên thẻ host ngoài cùng, còn `.ant-input-affix-wrapper` là phần tử con bên trong. CSS không ăn được khiến ô Tìm kiếm bị co về chiều cao mặc định (32px) thay vì 38px của select-box.
- **Fix**: Cập nhật selector CSS thành `.user-search-input-group.ant-input-affix-wrapper, .user-search-input-group .ant-input-affix-wrapper` để style ăn khớp chính xác vào phần tử con.
- **Files liên quan**: `codebase/frontend/src/styles.css`

### Lệch Mép Dưới Dọc Theo Baseline Của Nhãn Label
- **Ngày**: 2026-06-02
- **Vấn đề**: Sau khi sửa ô Tìm kiếm cao 38px, mép dưới của nó vẫn bị lệch nhẹ khoảng 3px–4px so với ng-select.
- **Root cause**: Label cột 1 "Danh mục" chứa chữ "g" có phần đuôi kéo xuống baseline, còn cột 2 "Tìm kiếm" không chứa. Thẻ `<label>` co giãn tự nhiên của trình duyệt khiến chiều cao label lệch nhau, đẩy input bên dưới lệch theo. Ngoài ra, việc gán Flexbox tùy chỉnh `.filter-field` trực tiếp lên thẻ Grid `nz-col` làm hỏng cơ chế Grid `nzAlign="bottom"` của Ant Design.
- **Fix**:
  1. Khóa chiều cao cố định của label ở mức `18px !important` và margin-bottom `6px !important` trong CSS component.
  2. Tách biệt `nz-col` ra khỏi `.filter-field` (đưa `.filter-field` làm con bọc bên trong).
  3. Ép chiều cao cứng `38px !important` đồng bộ ở mọi cấp độ thẻ (cả host `nz-input-group`, `nz-select` và con `.ant-input-affix-wrapper`, `.ant-select-selector`) trong global `styles.css`.
- **Files liên quan**: `expenses.component.html`, `expenses.component.css`, `styles.css`

### Các Ô Lọc Bị Dính Sát Vào Nhau Trong Modal
- **Ngày**: 2026-06-02
- **Vấn đề**: Trong modal "Kho Hóa đơn & Chứng từ Chi tiêu", ô select Danh mục và ô input Tìm kiếm bị dính chặt vào nhau, không có khoảng cách.
- **Root cause**: Các CSS reset hoặc rule kế thừa trong modal của dự án đè lên và làm triệt tiêu thuộc tính padding mặc định của các cột `nz-col` trong Grid Ant Design.
- **Fix**: Chuyển đổi bộ lọc sang sử dụng cấu trúc **CSS Grid** (`display: grid`) trực tiếp trên class `.filter-row` với thuộc tính `gap: 12px` (hoặc `gap: 16px` ở trang chính). Thuộc tính `gap` được trình duyệt dựng trực tiếp trên container và chắc chắn 100% không bao giờ có thể bị dính nhau.
- **Files liên quan**: `expenses.component.html`

---

## How-To

### Cách tạo Popup/Modal chuẩn Premium cho User Role
- **Ngày**: 2026-05-18
- **Bước thực hiện**:
  1. Thêm thuộc tính `nzClassName="user-role-modal"` vào thẻ `<nz-modal>` để kích hoạt theme ấm áp toàn cục (backdrop blur, bo góc 20px, bóng đổ 3 tầng).
  2. Định nghĩa một tiêu đề giàu trải nghiệm hình ảnh bằng cách sử dụng `[nzTitle]="modalTitleTpl"`.
  3. Tạo `<ng-template #modalTitleTpl>` chứa icon badge gradient chuyển màu sinh động:
     ```html
     <ng-template #modalTitleTpl>
       <div style="display:flex;align-items:center;gap:12px">
         <!-- Dùng thêm class bổ trợ như modal-title-icon-wrap--violet, --teal, --yellow để đổi màu icon -->
         <span class="modal-title-icon-wrap">
           <span nz-icon nzType="smile"></span>
         </span>
         <span class="modal-title-text">
           <span class="modal-title-main">Tiêu Đề Lớn</span>
           <span class="modal-title-sub">Mô tả hành động hoặc phụ chú nhỏ bên dưới</span>
         </span>
       </div>
     </ng-template>
     ```
  4. Bên trong phần body modal (`*nzModalContent`), nếu sử dụng form thì dùng lưới `class="user-modal-form-grid"` để các ô nhập liệu tự động chia cột gọn gàng và có focus glow màu cam óng ả.
- **Files liên quan**: `codebase/frontend/src/app/baby/baby.component.html`, `codebase/frontend/src/app/expenses/expenses.component.html`

### Cách thay thế input date native sang Ant Design Date Picker
- **Ngày**: 2026-06-01
- **Bước thực hiện**:
  1. Đảm bảo import `NzDatePickerModule` từ `'ng-zorro-antd/date-picker'` vào thuộc tính `imports` của **standalone component**.
  2. Trong HTML, thay thế `<input nz-input type="date">` hoặc `type="datetime-local"` bằng `<nz-date-picker>` và chỉ định định dạng hiển thị `nzFormat="yyyy-MM-dd"` hoặc `nzFormat="yyyy-MM-dd HH:mm"`.
  3. Với trường nhập thời gian (datetime-local), sử dụng thêm directive `[nzShowTime]="true"` để người dùng chọn cả giờ.
  4. Áp dụng `style="width: 100%"` để component hiển thị vừa vặn với ô lưới hoặc bảng.
- **Files liên quan**: `admin-families.component.html`, `family.component.html`, `admin-premium.component.html`

---

## Patterns

### Button Classes cho Role User
- **Ngày**: 2026-05-18
- **Chi tiết**: Luôn sử dụng bộ 3 class nút bấm chuẩn hóa toàn cục thay vì tự viết CSS hoặc dùng nút thô:
  - `.btn-user-primary` (Nút chính): Gradient cam-hồng, bóng đổ hồng nhẹ, hover nhô lên `translateY(-1px)`.
  - `.btn-user-outline` (Nút phụ/viền): Viền cam chuẩn, chữ cam, nền trong suốt, hover cam mờ `rgba(249, 115, 22, 0.05)`.
  - `.btn-user-secondary` (Nút nhẹ): Nền cam cực mờ `rgba(249, 115, 22, 0.06)`, viền cam siêu nhạt, chữ cam.
- **Files liên quan**: `codebase/frontend/src/styles.css`

### Bento Grid & Fintech Receipt Card Design Pattern
- **Ngày**: 2026-05-18
- **Task**: Nâng cấp popup Quản lý hóa đơn Bento Grid.
- **Chi tiết**:
  Áp dụng layout bento 2 cột để quản lý hóa đơn. Một thẻ giao dịch dạng Fintech Slip (nền gradient mờ, viền cam nhạt, chữ to) làm điểm nhấn visual. Thẻ upload (Dropzone) dạng lớn viền đứt nét, có icon cloud-upload bay nhẹ khi hover. Các thẻ hóa đơn dạng bento card, icon đổi màu theo định dạng tệp (PDF/Ảnh) kèm tooltip hướng dẫn rê chuột.
- **Files liên quan**: `codebase/frontend/src/app/expenses/expenses.component.html`, `codebase/frontend/src/app/expenses/expenses.component.css`

### Đồng bộ dữ liệu Date Picker và API (String vs Date)
- **Ngày**: 2026-06-01
- **Chi tiết**: Component `nz-date-picker` của Ng-Zorro yêu cầu dữ liệu liên kết `[(ngModel)]` hoặc `formControl` là một đối tượng `Date` (hoặc `null`/`undefined`). Để đồng bộ mượt mà với API lưu trữ dữ liệu dạng chuỗi (`yyyy-MM-dd` hoặc ISO string) mà không phải thay đổi các cấu trúc/hàm gọi API lớn, áp dụng pattern:
  1. Khởi tạo trường dữ liệu trong form/biến là `Date | null = null`.
  2. Khi nhận dữ liệu từ API, chuyển chuỗi sang `Date`: `dob ? new Date(dob) : null`.
  3. Khi gửi dữ liệu lên API, sử dụng hàm chuẩn hóa tập trung `normalizeDateInput` or `toIsoOffset` để chuyển `Date` object về chuỗi `'yyyy-MM-dd'` hoặc chuỗi ISO thích hợp.
- **Files liên quan**: `admin-families.component.ts`, `family.component.ts`, `admin-premium.component.ts`

### Perfect Alignment for Filters (CSS Grid + Height Lock)
- **Ngày**: 2026-06-02
- **Chi tiết**: Để tạo ra bộ lọc (filter) thẳng hàng 100% không tì vết mà vẫn bảo toàn thiết kế Premium ấm áp, tinh tế:
  1. Sử dụng CSS Grid (`display: grid`, `gap`, `align-items: end`) làm layout chủ đạo thay vì Grid thư viện dễ bị mất padding/gutter trong môi trường modal.
  2. Khóa chiều cao cố định cho label (`height: 18px; line-height: 18px;`) và margin-bottom (`6px`) để triệt tiêu chênh lệch baseline do các ký tự có đuôi (g, p, y).
  3. Ép chiều cao cứng phủ bì cho các select-box/input-box ở mức **38px** ở mọi cấp độ thẻ (cả host và con), đảm bảo không có sự chênh lệch kích thước thực tế hiển thị.
- **Files liên quan**: `expenses.component.html`, `expenses.component.css`, `styles.css`
