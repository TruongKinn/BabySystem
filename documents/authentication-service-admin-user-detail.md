# Tài liệu Thiết Kế Tính Năng: Nâng Cấp Màn Hình Admin - Quản Lý Chi Tiết Thông Tin User (Bento Grid Modal)

Tài liệu này đặc tả chi tiết thiết kế kỹ thuật, giao diện người dùng Bento Grid Modal và kế hoạch triển khai cho tính năng nâng cấp màn hình Admin Quản lý Người dùng (`/admin/users`). Tính năng này cung cấp cho Admin góc nhìn 360 độ về hoạt động của User và toàn quyền quản trị các thực thể liên quan (Gia đình, Thành viên, Em bé) trực tiếp tại chỗ.

---

## 1. Tổng Quan Tính Năng

Hiện tại, trang quản trị Admin (`/admin/users`) hiển thị danh sách người dùng dưới dạng bảng đơn giản. Để nâng tầm trải nghiệm người dùng lên chuẩn **Premium** và cung cấp **toàn quyền quản lý** cho Admin:
* **Nút hành động mới:** Bổ sung nút **"Xem chi tiết"** (View Details) trên mỗi dòng của bảng danh sách người dùng.
* **Modal Chi Tiết Bento Grid:** Khi Admin bấm "Xem chi tiết", hệ thống hiển thị một Modal được thiết kế theo phong cách Bento Grid hiện đại, tích hợp đầy đủ thông tin:
  * **Khối 1: Thông tin cá nhân (Profile Details Card)**: Hiển thị đầy đủ thông tin định danh, ngày sinh, giới tính, trạng thái, vai trò hệ thống, và ảnh đại diện lớn (hỗ trợ đổi ảnh đại diện trực tiếp).
  * **Khối 2: Quản lý Gia đình & Thành viên (Families & Members Card)**: Liệt kê các gia đình mà User tham gia, cho phép thay đổi Vai trò thành viên (OWNER, MEMBER...) hoặc Xóa thành viên khỏi gia đình ngay tại chỗ.
  * **Khối 3: Quản lý Em bé (Babies Card)**: Liệt kê tất cả em bé thuộc các gia đình của User đó. Cho phép Admin sửa nhanh thông tin của Bé (tên, ngày sinh, chiều cao, cân nặng...) hoặc Xóa bé trực tiếp bằng Popup xác nhận.

---

## 2. Nhật Ký Quyết Định (Decision Log)

| Quyết định | Các phương án thay thế xem xét | Lý do lựa chọn |
|:---|:---|:---|
| **Cấu trúc Component:** Tách biệt thành Sub-Component riêng (`AdminUserDetailModalComponent`) | Viết trực tiếp code modal và gọi API vào component danh sách cha (`AdminUsersComponent`). | Giữ cho file cha tinh gọn, dễ bảo trì, cô lập hoàn toàn các logic nghiệp vụ phức tạp của Modal (CRUD gia đình, em bé) sang một component con độc lập. |
| **Bố cục giao diện:** Bento Grid 3 cột linh hoạt | Giao diện dạng Tab thông thường, bảng con (nested table). | Phong cách Bento Grid đem lại trải nghiệm trực quan **Premium**, sống động và chuyên nghiệp vượt trội. Giúp hiển thị lượng thông tin lớn mà không làm rối mắt Admin. |
| **Cơ chế tải dữ liệu:** Lazy Loading kết hợp Skeleton | Tải trước toàn bộ dữ liệu (Eager Loading) hoặc dùng Spinner truyền thống. | Lazy loading giúp trang danh sách tải cực nhanh. Skeleton loading óng ánh tạo cảm giác phản hồi giao diện tức thì và mượt mà. |
| **Bảo mật & Quyền hạn:** Tích hợp xác thực JWT Admin và Popconfirm | Thực thi trực tiếp không cần xác nhận. | Các hành động xóa thành viên hoặc xóa bé rất nhạy cảm, bắt buộc phải có `nz-popconfirm` để đảm bảo tính an toàn dữ liệu và ngăn chặn bấm nhầm. |

---

## 3. Kiến Trúc Kỹ Thuật & Tích Hợp API

Chúng ta sẽ tích hợp API từ 3 microservices khác nhau thông qua API Gateway:

```mermaid
graph TD
    subgraph Frontend [Angular Client]
        Parent[AdminUsersComponent]
        Modal[AdminUserDetailModalComponent]
    end
    
    subgraph Gateway [API Gateway - Port 4953]
        GW[Gateway Filter]
    end
    
    subgraph Services [Backend Microservices]
        AuthSvc[Authentication Service - Port 8081]
        AccountSvc[Account Service - Port 8082]
        BabySvc[Baby Service - Port 8087]
    end
    
    Parent -->|Mở modal & Truyền user| Modal
    Modal -->|1. GET /auth/account/user/{id}| GW
    Modal -->|2. GET /account/users/{id}/families| GW
    Modal -->|3. GET /baby/babies?familyId={familyId}| GW
    
    Modal -->|4. PUT /account/admin/families/{id}/members/{userId}/role| GW
    Modal -->|5. DELETE /account/admin/families/{id}/members/{userId}| GW
    Modal -->|6. PUT /baby/babies/{id}| GW
    Modal -->|7. DELETE /baby/babies/{id}| GW
    
    GW -->|Chuyển tiếp 1| AuthSvc
    GW -->|Chuyển tiếp 2, 4, 5| AccountSvc
    GW -->|Chuyển tiếp 3, 6, 7| BabySvc
```

### 3.1. Danh Sách API Sử Dụng

1. **Lấy thông tin tài khoản chi tiết:**
   * **Endpoint:** `GET /auth/account/user/{id}`
   * **Mục đích:** Tải thông tin cá nhân chính xác nhất từ Database.
2. **Lấy danh sách Gia đình của User:**
   * **Endpoint:** `GET /account/users/{id}/families`
   * **Mục đích:** Liệt kê các gia đình mà User này là thành viên.
3. **Lấy danh sách các Bé trong từng gia đình:**
   * **Endpoint:** `GET /baby/babies?familyId={familyId}`
   * **Mục đích:** Tải danh sách em bé thuộc về gia đình cụ thể.
4. **Cập nhật Vai trò thành viên trong Gia đình (Admin):**
   * **Endpoint:** `PUT /account/admin/families/{familyId}/members/{userId}/role?role={role}`
   * **Mục đích:** Admin thay đổi quyền hạn của User trong Gia đình (ví dụ: OWNER, MEMBER).
5. **Xóa thành viên khỏi Gia đình (Admin):**
   * **Endpoint:** `DELETE /account/admin/families/{familyId}/members/{userId}`
   * **Mục đích:** Admin xóa hoàn toàn liên kết của User khỏi Gia đình.
6. **Cập nhật thông tin Em bé:**
   * **Endpoint:** `PUT /baby/babies/{babyId}`
   * **Body:** `UpdateBabyRequest` (tên, ngày sinh, chiều cao, cân nặng...)
   * **Mục đích:** Chỉnh sửa thông tin em bé.
7. **Xóa Em bé khỏi hệ thống:**
   * **Endpoint:** `DELETE /baby/babies/{babyId}`
   * **Mục đích:** Xóa vĩnh viễn em bé.

---

## 4. Thiết Kế Giao Diện Người Dùng (UI/UX) Bento Grid

Modal sẽ áp dụng bộ lọc CSS chuẩn ấm áp (`nzClassName="user-role-modal"`), bo góc `20px`, backdrop blur mờ và bóng đổ 3 tầng.

### 4.1. Bản phác thảo Bố cục Bento Grid (Desktop Layout)
```
+---------------------------------------------------------------------------------------------+
|  [Icon Badge] Chi Tiết Người Dùng                                                       [X] |
|  Thông tin 360 độ về tài khoản, gia đình và em bé trong hệ thống                            |
+---------------------------------------------------------------------------------------------+
|                                                                                             |
|  +---------------------------+  +---------------------------------------------------------+  |
|  | KHỐI 1: PROFILE CARD      |  | KHỐI 2: QUẢN LÝ GIA ĐÌNH & THÀNH VIÊN                   |  |
|  |                           |  |                                                         |  |
|  |  [ Avatar Tròn Lớn ]      |  |  +---------------------------------------------------+  |  |
|  |                           |  |  | Gia đình: Home Sweet Home (ID: 10)                |  |  |
|  |  Username: truongkinn     |  |  | Vai trò: OWNER                      [Đổi vai trò] |  |  |
|  |  Email: tk@gmail.com      |  |  |                                     [Xóa khỏi nhà]|  |  |
|  |  SĐT: 0987654321          |  |  +---------------------------------------------------+  |  |
|  |  Ngày sinh: 18/05/1995    |  |  | Gia đình: Grandparents (ID: 12)                   |  |  |
|  |  Giới tính: Nam           |  |  | Vai trò: MEMBER                     [Đổi vai trò] |  |  |
|  |                           |  |  |                                     [Xóa khỏi nhà]|  |  |
|  |  [Khóa/Mở Khóa Tài Khoản]  |  |  +---------------------------------------------------+  |  |
|  |  [Reset Mật Khẩu]         |  +---------------------------------------------------------+  |
|  +---------------------------+  | KHỐI 3: QUẢN LÝ EM BÉ (BABIES)                          |  |
|                                 |                                                         |  |
|                                 |  +-------------------------+   +---------------------+  |  |
|                                 |  | Bé: Miu Miu (2 tuổi)    |   | Bé: Gấu Con (1 tuổi)|  |  |
|                                 |  | Cân nặng: 12.5 kg       |   | Cân nặng: 9.8 kg    |  |  |
|                                 |  | Chiều cao: 88 cm        |   | Chiều cao: 76 cm    |  |  |
|                                 |  | [Sửa Bé]    [Xóa Bé]    |   | [Sửa Bé]   [Xóa Bé] |  |  |
|                                 |  +-------------------------+   +---------------------+  |  |
|                                 +---------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------+
|                                                                                [Đóng Modal] |
+---------------------------------------------------------------------------------------------+
```

### 4.2. Các Lớp CSS Chuẩn Hóa Được Sử Dụng (`src/styles.css`):
*   `.user-role-modal`: Bật theme ấm áp, bo góc `20px` cao cấp cho Modal.
*   `.btn-user-primary` (Gradient cam-hồng) cho các hành động chính.
*   `.btn-user-outline` (Viền cam, chữ cam) cho các hành động phụ.
*   `.btn-user-secondary` (Nền cam cực mờ) cho các thẻ/pill hiển thị trạng thái.

---

## 5. Kế Hoạch Triển Khai Chi Tiết (Implementation Plan)

### Pha 1: Chuẩn bị & Cấu trúc (Frontend)
1. **Tạo Component Mới**: 
   * Tạo thư mục `codebase/frontend/src/app/admin/users/detail-modal`.
   * Tạo các file: `admin-user-detail-modal.component.ts`, `admin-user-detail-modal.component.html`, và `admin-user-detail-modal.component.css`.
2. **Khai báo Dịch thuật (i18n)**:
   * Thêm các khóa dịch thuật cho Modal Chi tiết, Danh sách gia đình, vai trò, hành động sửa/xóa em bé trong file `vi.json` và `en.json`.

### Pha 2: Phát triển UI Bento Grid & Logic Fetch dữ liệu
3. **Phát triển Template HTML & Style CSS**:
   * Thiết kế giao diện Bento Grid theo bản vẽ.
   * Thêm hiệu ứng Skeleton Loading óng ánh chuyển động mượt mà khi đang tải dữ liệu.
4. **Phát triển Logic Component TS**:
   * Tiêm `HttpClient`, `NzMessageService`, `I18nService`.
   * Viết hàm `loadAllUserData()` để fetch song song thông tin User, Gia đình, và các Bé (sử dụng `forkJoin` hoặc gọi tuần tự tối ưu).
   * Cài đặt bộ ánh xạ ảnh đại diện và cache-busting.

### Pha 3: Triển khai các Hành động Quản trị (CRUD)
5. **Quản lý Thành viên Gia đình**:
   * Hàm `changeMemberRole(familyId, memberId, newRole)`: Gọi API `PUT /account/admin/families/{id}/members/{userId}/role`.
   * Hàm `removeMemberFromFamily(familyId, memberId)`: Gọi API `DELETE /account/admin/families/{id}/members/{userId}` (có kèm `nz-popconfirm`).
6. **Quản lý Em bé**:
   * Xây dựng form/popup con nhỏ gọn để Admin sửa thông tin Bé.
   * Hàm `updateBaby(babyId, babyData)`: Gọi API `PUT /baby/babies/{id}`.
   * Hàm `deleteBaby(babyId)`: Gọi API `DELETE /baby/babies/{id}` (có kèm `nz-popconfirm`).

### Pha 4: Tích hợp vào Component Cha & Kiểm thử
7. **Tích hợp nút "Xem chi tiết" vào bảng**:
   * Cập nhật file `admin-users.component.html` để thêm nút "Xem chi tiết" có icon và style đẹp mắt.
   * Hàm `openUserDetail(user)` trong `admin-users.component.ts`: Gọi `NzModalService` để mở `AdminUserDetailModalComponent`.
8. **Kiểm thử & Tinh chỉnh (QA)**:
   * Kiểm thử tính năng xem thông tin, skeleton loading.
   * Kiểm thử đổi vai trò, xóa thành viên, cập nhật thông tin em bé, xóa em bé.
   * Đảm bảo tính nhất quán dữ liệu (modal làm mới dữ liệu sau khi sửa/xóa thành công).
