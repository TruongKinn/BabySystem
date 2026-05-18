# User UI/UX & Modal Design System

> Tổng hợp kiến thức về hệ thống giao diện và chuẩn hóa nút bấm, popup cho vai trò User trong dự án.
> Cập nhật lần cuối: 2026-05-18

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

---

## Patterns

### Button Classes cho Role User
- **Ngày**: 2026-05-18
- **Chi tiết**: Luôn sử dụng bộ 3 class nút bấm chuẩn hóa toàn cục thay vì tự viết CSS hoặc dùng nút thô:
  - `.btn-user-primary` (Nút chính): Gradient cam-hồng, bóng đổ hồng nhẹ, hover nhô lên `translateY(-1px)`.
  - `.btn-user-outline` (Nút phụ/viền): Viền cam chuẩn, chữ cam, nền trong suốt, hover cam mờ `rgba(249, 115, 22, 0.05)`.
  - `.btn-user-secondary` (Nút nhẹ): Nền cam cực mờ `rgba(249, 115, 22, 0.06)`, viền cam siêu nhạt, chữ cam.
- **Files liên quan**: `codebase/frontend/src/styles.css`
