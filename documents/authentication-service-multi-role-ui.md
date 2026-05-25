# Hướng dẫn Thiết kế UI/UX cho Người dùng có Nhiều Vai trò (Multi-Role UI/UX Specification)

Tài liệu này đặc tả các chuẩn mực và giải pháp thiết kế giao diện người dùng (UI/UX) trên hệ thống **BabySystem** khi một tài khoản sở hữu nhiều vai trò (roles) hoặc quyền hạn (permissions) khác nhau.

---

## 1. Bản chất Phân quyền trong Hệ thống (Role Architecture)

Hệ thống **BabySystem (Mom Super App)** quản lý phân quyền theo 2 trục chính:

| Trục phân quyền | Phạm vi áp dụng (Scope) | Các vai trò chính | Hành vi hệ thống |
| :--- | :--- | :--- | :--- |
| **Global Role** *(Quyền hệ thống)* | Toàn bộ ứng dụng, được xác định từ Token JWT của Keycloak / Auth Service. | `ADMIN`, `OWNER`, `USER` | Quyết định cổng giao diện truy cập chính: Cổng quản trị (**Admin Portal - `/admin/*`**) hoặc Cổng gia đình (**User Portal - `/app/*`**). |
| **Workspace / Family Role** *(Quyền ngữ cảnh)* | Từng Gia đình cụ thể, được quản lý ở Account Service. | `OWNER` (Chủ gia đình), `MEMBER` (Thành viên) | Quyết định quyền thao tác dữ liệu của em bé, hóa đơn chi tiêu trong gia đình đó (Xem, Thêm, Sửa, Xóa). Một người có thể thuộc nhiều gia đình với các vai trò khác nhau. |

---

## 2. Các mô hình thiết kế UI/UX khi người dùng có Nhiều Vai trò

### 2.1. Giải pháp 1: Portal Switching (Chuyển đổi Cổng giao diện)
*Áp dụng khi một tài khoản vừa là Quản trị viên hệ thống (ADMIN/OWNER), vừa là Người dùng thông thường (USER) quản lý gia đình riêng.*

*   **Tại màn hình Đăng nhập (`/app/login` & `/admin/login`)**:
    *   Hệ thống thiết kế một **Portal Switch Link** nổi bật ở góc dưới form đăng nhập, cho phép người dùng chuyển hướng nhanh chóng.
    *   *Hiệu ứng Premium:* Sử dụng các liên kết chuyển màu mượt mà (smooth text color transition) với ánh glow mờ dưới nền khi hover.
*   **Khi đã đăng nhập thành công**:
    *   Trình điều hướng tự động kiểm tra vai trò cao nhất của người dùng thông qua Token. Nếu người dùng sở hữu quyền `ADMIN` hoặc `OWNER` hệ thống, mặc định chuyển về `/admin/dashboard`. Ngược lại, chuyển về `/app/dashboard`.
    *   Trong giao diện chính (Navbar/Header), tại góc Avatar người dùng, tích hợp menu chuyển đổi nhanh (Quick Portal Switcher). Khi nhấn vào, người dùng có thể nhảy qua lại giữa `/admin` và `/app` mà không cần đăng nhập lại nhờ cơ chế Single Sign-On (SSO).
    *   **Sidebar & Navigation**: Tự động render menu tương ứng (`adminMenuItems` vs `userMenuItems`) và cập nhật `homeRoute` dựa trên URL đang truy cập hiện hành (`/admin` hoặc `/app`), đảm bảo phân tách rõ ràng luồng trải nghiệm.

---

### 2.2. Giải pháp 2: Workspace Context Switching (Chuyển đổi Ngữ cảnh Gia đình)
*Áp dụng khi người dùng tham gia vào nhiều Gia đình khác nhau. Ví dụ: Là OWNER (Chủ nhà) ở Gia đình A (đầy đủ quyền quản lý em bé, tài chính) nhưng chỉ là MEMBER ở Gia đình B (chỉ có quyền xem thông tin).*

Giao diện sẽ thể hiện thông qua bộ 3 trụ cột thiết kế:

#### A. Bộ chọn Không gian làm việc (Premium Workspace Switcher)
*   Nằm tại khu vực trên cùng của **Sidebar** hoặc trên thanh **Navbar**.
*   Thiết kế dưới dạng Dropdown bo tròn mềm mại (`border-radius: 12px`), nền phủ kính mờ (Glassmorphism `backdrop-filter: blur(12px)`) kết hợp viền mỏng tinh tế (`1px solid rgba(255,255,255,0.1)`).
*   Mỗi lựa chọn gia đình đi kèm một biểu tượng avatar chữ cái viết tắt, kèm theo nhãn vai trò hiện tại của người dùng trong gia đình đó dưới dạng Badge nhỏ.

#### B. Huy hiệu Vai trò theo Ngữ cảnh (Contextual Role Badges/Pills)
*   Hệ thống hiển thị rõ vai trò hiện hành của người dùng trên trang thông tin gia đình bằng các **Role Pills** cao cấp được định nghĩa màu sắc nhất quán qua CSS variables:
    *   `OWNER`: Pill màu cam ấm/vàng hổ phách (`#f97316`) thể hiện quyền kiểm soát tối cao.
    *   `ADMIN`: Pill màu tím hoàng gia/indigo đại diện cho quyền quản trị.
    *   `USER / MEMBER`: Pill màu xanh ngọc/teal dịu mắt đại diện cho thành viên thông thường.
*   Khi hover vào các Badge này, áp dụng hiệu ứng nhô nhẹ (`translateY(-1px)`) kết hợp tỏa sáng nhẹ nhàng (`box-shadow glow`), tạo cảm giác giao diện "sống động" (Alive UI).

#### C. Phản hồi và Kiểm soát Tương tác Động (Dynamic Action Control)
*   **Không ẩn hoàn toàn phần tử nếu không cần thiết**: Thay vì ẩn giấu các nút bấm khiến người dùng hoang mang, hệ thống áp dụng cơ chế **Disabled State Premium** (Vô hiệu hóa cao cấp).
    *   Ví dụ: Nút "Cài đặt gia đình" hoặc "Thêm em bé" của thành viên `MEMBER` sẽ chuyển sang màu xám mờ tinh tế, biểu tượng ổ khóa nhỏ xuất hiện bên cạnh.
    *   Khi hover chuột vào, hệ thống hiển thị một **Tooltip** giải thích trực quan: *"Bạn cần quyền Chủ gia đình (Owner) để thực hiện hành động này"*.
*   **Inline Form Editing**: Tại Bento Grid Modal chi tiết, khi ở vai trò `OWNER`, các thông tin em bé hoặc gia đình hiển thị các nút Edit inline. Khi ở vai trò `MEMBER`, các nút này tự động chuyển đổi thành trạng thái chỉ xem (Read-only) hoặc biến mất để bảo toàn tính toàn vẹn dữ liệu.

---

## 3. Mẫu Thiết kế Giao diện Chuyển đổi Vai trò Cao cấp (Premium Role Switcher Template)

Dưới đây là mã nguồn Angular mẫu thể hiện bộ nút chuyển đổi cổng hoặc không gian làm việc với hiệu ứng tương tác cao cấp theo chuẩn **Web Design Backbone**:

### 3.1. Template HTML (`role-switcher.component.html`)
```html
<!-- Container chuyển đổi không gian làm việc cao cấp -->
<div class="workspace-switcher-container">
  <div class="active-workspace-card" nz-popover [nzPopoverContent]="workspaceListTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft">
    <div class="workspace-avatar">
      <span>{{ activeFamilyName | slice:0:1 | uppercase }}</span>
      <div class="role-mini-badge" [ngClass]="roleClassOf(currentRole)">
        <span nz-icon [nzType]="currentRole === 'OWNER' ? 'crown' : 'user'"></span>
      </div>
    </div>
    <div class="workspace-info">
      <span class="workspace-name">{{ activeFamilyName }}</span>
      <span class="workspace-role-label">{{ getRoleLabel(currentRole) }}</span>
    </div>
    <span class="chevron-icon" nz-icon nzType="down"></span>
  </div>
</div>

<!-- Template Dropdown danh sách các không gian/gia đình -->
<ng-template #workspaceListTpl>
  <div class="premium-workspace-dropdown">
    <div class="dropdown-header">
      <span class="dropdown-title">Không gian gia đình của bạn</span>
      <span class="dropdown-subtitle">Nhấp để chuyển đổi môi trường thao tác</span>
    </div>
    
    <div class="workspace-list">
      <div *ngFor="let item of families" 
           class="workspace-item" 
           [class.active]="item.id === activeFamilyId"
           (click)="switchWorkspace(item)">
        <div class="item-avatar">
          <span>{{ item.name | slice:0:1 | uppercase }}</span>
        </div>
        <div class="item-details">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-role" [ngClass]="roleClassOf(item.role)">
            {{ getRoleLabel(item.role) }}
          </span>
        </div>
        <span *ngIf="item.id === activeFamilyId" class="check-icon" nz-icon nzType="check"></span>
      </div>
    </div>

    <div class="dropdown-footer">
      <button class="btn-create-workspace">
        <span nz-icon nzType="plus"></span>
        Tạo gia đình mới
      </button>
    </div>
  </div>
</ng-template>
```

### 3.2. Phong cách CSS (`role-switcher.component.css`)
```css
/* Custom variables dùng cho hệ thống màu và bóng đổ */
:root {
  --color-primary: #f97316;
  --color-primary-light: #ffedd5;
  --color-primary-dark: #ea580c;
  --color-bg-glass: rgba(255, 255, 255, 0.75);
  --color-border-glass: rgba(249, 115, 22, 0.15);
  --shadow-premium: 0 10px 25px -5px rgba(249, 115, 22, 0.08), 0 8px 10px -6px rgba(249, 115, 22, 0.08);
}

.workspace-switcher-container {
  padding: 8px;
  background: var(--color-bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border-glass);
  border-radius: 16px;
  max-width: 260px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-premium);
}

.workspace-switcher-container:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
  box-shadow: 0 12px 30px -5px rgba(249, 115, 22, 0.15);
}

.active-workspace-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.workspace-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--color-primary), #ec4899);
  color: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.role-mini-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #fff;
}

.role-mini-badge.role-owner {
  background: #f59e0b; /* Vàng cam Hổ phách */
}

.role-mini-badge.role-member {
  background: #14b8a6; /* Xanh ngọc Teal */
}

.workspace-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.workspace-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.workspace-role-label {
  font-size: 11px;
  color: #6b7280;
}

.chevron-icon {
  color: #9ca3af;
  font-size: 12px;
  transition: transform 0.3s ease;
}

/* Premium Workspace Dropdown */
.premium-workspace-dropdown {
  width: 280px;
  padding: 4px;
}

.dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.dropdown-title {
  display: block;
  font-weight: 700;
  color: #111827;
  font-size: 14px;
}

.dropdown-subtitle {
  font-size: 11px;
  color: #9ca3af;
}

.workspace-list {
  padding: 8px 0;
  max-height: 240px;
  overflow-y: auto;
}

.workspace-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 10px;
  margin: 2px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.workspace-item:hover {
  background: rgba(249, 115, 22, 0.05);
}

.workspace-item.active {
  background: var(--color-primary-light);
}

.item-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e5e7eb;
  color: #4b5563;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.workspace-item.active .item-avatar {
  background: var(--color-primary);
  color: #fff;
}

.item-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.workspace-item.active .item-name {
  font-weight: 600;
  color: #111827;
}

.item-role {
  font-size: 10px;
  display: inline-block;
  align-self: flex-start;
  padding: 1px 6px;
  border-radius: 9999px;
  font-weight: 500;
}

.item-role.role-owner {
  background: #fef3c7;
  color: #d97706;
}

.item-role.role-member {
  background: #ccfbf1;
  color: #0d9488;
}

.check-icon {
  color: var(--color-primary);
  font-size: 14px;
}

.dropdown-footer {
  padding: 8px 8px 4px 8px;
  border-top: 1px solid #f3f4f6;
}

.btn-create-workspace {
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-create-workspace:hover {
  background: var(--color-primary-light);
  transform: scale(0.98);
}
```

---

## 4. Tóm tắt Nguyên tắc Thiết kế Vàng (UI/UX Best Practices)

1.  **Luôn hiển thị rõ Vai trò hiện hành**: Không bao giờ để người dùng tự hỏi *"Mình đang thao tác với tư cách gì?"*. Huy hiệu vai trò nổi bật, bắt mắt tại các khu vực nhạy cảm là chìa khóa.
2.  **Thông báo thay vì Ẩn giấu**: Sử dụng Tooltip giải thích lý do hành động bị khóa thay vì ẩn các nút điều hướng cốt lõi để duy trì sự nhất quán của bố cục.
3.  **Chuyển đổi liền mạch (Seamless Context Switch)**: Cơ chế đổi ngữ cảnh gia đình hoặc cổng quản trị phải diễn ra ngay tại màn hình hiện tại mà không yêu cầu tải lại toàn trang hoặc đăng nhập lại.
4.  **Tích hợp Bento Grid & Form Editing**: Sử dụng cấu trúc Bento linh hoạt chia khối thông tin, kích hoạt hoặc khóa chức năng trực tiếp trên từng khối tùy thuộc vào quyền của người dùng tại không gian đó.
