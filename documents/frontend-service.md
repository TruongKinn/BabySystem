# Báo cáo Dịch thuật và Bản địa hóa (i18n) - Frontend Service

Tài liệu này tổng hợp quá trình rà soát, tự động hóa so sánh cấu trúc khóa (keys) và thực hiện dịch thuật/đồng bộ hóa hệ thống đa ngôn ngữ (i18n) cho ứng dụng frontend (`codebase/frontend`).

## 1. Phương pháp Rà soát & Phát hiện lỗi i18n

Chúng tôi đã xây dựng các công cụ phân tích tự động bằng Node.js nằm trong thư mục scratch để giải quyết triệt để vấn đề:
1. **So sánh Cấu trúc Khóa:** Đối chiếu toàn bộ cấu trúc JSON của hai tệp `en.json` và `vi.json` để tìm ra các khóa bị lệch (chỉ có ở ngôn ngữ này mà thiếu ở ngôn ngữ kia).
2. **Quét Mã nguồn Thực tế:** Duyệt đệ quy toàn bộ thư mục `src/app` (gồm các tệp `.ts` và `.html`) để trích xuất các mã khóa i18n thực tế đang được gọi qua `translate` pipe hoặc `TranslateService.instant/get/stream`.
3. **Phát hiện Dịch thiếu/Chưa dịch (Chữ tiếng Anh trong bản dịch Việt):** Lọc ra danh sách các khóa có giá trị giống nhau hoàn toàn giữa tiếng Anh và tiếng Việt để phát hiện các từ tiếng Anh chưa được chuyển ngữ.

---

## 2. Kết quả Rà soát & Khắc phục

### A. Đồng bộ hóa Khóa thiếu giữa hai ngôn ngữ
Chúng tôi phát hiện có **25 khóa** có mặt trong `vi.json` nhưng bị thiếu hoàn toàn trong `en.json`. Chúng tôi đã tiến hành biên dịch chuẩn xác sang tiếng Anh và cập nhật vào `en.json`:

| Khóa i18n | Bản dịch Tiếng Việt (Gốc) | Bản dịch Tiếng Anh (Đã bổ sung) |
| :--- | :--- | :--- |
| `layout.crypto.enterSecretKey` | Vui lòng nhập khóa bí mật. | Please enter the secret key. |
| `layout.crypto.encryptSuccess` | Mã hóa thành công. | Encryption successful. |
| `layout.crypto.encryptFailed` | Mã hóa thất bại. | Encryption failed. |
| `layout.crypto.decryptSuccess` | Giải mã thành công. | Decryption successful. |
| `layout.crypto.decryptFailed` | Giải mã thất bại. | Decryption failed. |
| `layout.crypto.oneWayHash` | Thuật toán này chỉ băm một chiều và không thể giải mã. | This algorithm is one-way hash only and cannot be decrypted. |
| `layout.crypto.publicKeyFetched` | Đã lấy public key cho alias: `{{alias}}` | Fetched public key for alias: `{{alias}}` |
| `layout.crypto.fetchPublicKeyFailed` | Không thể lấy public key. | Failed to fetch public key. |
| `layout.crypto.aliasFilled` | Đã điền alias mặc định. | Default alias filled. |
| `layout.crypto.copied` | Đã sao chép vào clipboard. | Copied to clipboard. |
| `layout.vault.loadMetadataFailed` | Không thể tải metadata Vault. | Failed to load Vault metadata. |
| `momApp.admin.families.modal.displayNamePlaceholder` | Vd: Nguyễn Văn A | e.g., John Doe |
| `momApp.admin.families.modal.username` | Tên đăng nhập | Username |
| `momApp.admin.families.modal.usernamePlaceholder` | Vd: nguyen.a | e.g., john.doe |
| `momApp.admin.families.modal.email` | Email | Email |
| `momApp.admin.families.modal.emailPlaceholder` | Vd: a@example.com | e.g., john.doe@example.com |
| `momApp.admin.families.modal.searchExisting` | Tìm kiếm có sẵn | Search existing |
| `momApp.admin.families.modal.createNew` | Tạo mới | Create new |
| `momApp.admin.families.modal.inviteMemberBtn` | Thêm thành viên mới | Add new member |
| `momApp.admin.families.messages.allFieldsRequired` | Vui lòng nhập đầy đủ thông tin! | Please enter all fields! |
| `momApp.admin.families.messages.inviteMemberSuccess` | Thêm thành viên mới thành công! | New member added successfully! |
| `momApp.family.card.username` | Tài khoản | Username |
| `momApp.family.card.email` | Email | Email |
| `momApp.family.card.relation` | Quan hệ | Relationship |
| `momApp.family.card.branch` | Thuộc nhánh | Branch |

---

### B. Bổ sung các Khóa i18n bị thiếu trong cả hai tệp
Quá trình quét mã nguồn phát hiện hai khóa quan trọng được sử dụng trực tiếp trong giao diện HTML nhưng chưa hề được định nghĩa trong bất kỳ tệp JSON nào:
1. **`momApp.admin.users.table.avatar`**:
   - *Tiếng Anh:* `Avatar`
   - *Tiếng Việt:* `Ảnh đại diện`
2. **`momApp.common.none`**:
   - *Tiếng Anh:* `None`
   - *Tiếng Việt:* `Không có`

Cả hai khóa này đã được chèn vào đúng cấu trúc phân cấp tương ứng trong cả `en.json` và `vi.json`.

---

### C. Dịch hóa triệt để các nhãn tiếng Anh còn sót trong giao diện Tiếng Việt
Phân tích so sánh giá trị trùng lặp đã chỉ ra **48 khóa** trong `vi.json` vẫn giữ nguyên giá trị tiếng Anh mặc dù giao diện người dùng hiển thị ở ngôn ngữ Tiếng Việt. Chúng tôi đã tiến hành dịch nghĩa toàn bộ sang tiếng Việt cao cấp, chuẩn ngữ cảnh sản phẩm doanh nghiệp:

- `layout.menu.workspaceGroup` $\rightarrow$ **Không gian làm việc**
- `layout.menu.aiGroup` $\rightarrow$ **Trợ lý AI**
- `myPassword.title` $\rightarrow$ **Mật khẩu của tôi**
- `vaultWorkspace.metadata.health` $\rightarrow$ **Trạng thái hoạt động**
- `vaultWorkspace.metadata.secretPath` $\rightarrow$ **Đường dẫn bí mật**
- `accessControl.assignment.apiTesterTitle` $\rightarrow$ **Trình kiểm thử API**
- `accessControl.assignment.apiTesterMethod` $\rightarrow$ **Phương thức**
- `accessControl.assignment.apiTesterEndpoint` $\rightarrow$ **Điểm cuối**
- `accessControl.assignment.apiTesterQueryParams` $\rightarrow$ **Tham số truy vấn**
- `accessControl.assignment.apiTesterHeaders` $\rightarrow$ **Tiêu đề**
- `accessControl.assignment.apiTesterKey` $\rightarrow$ **Khóa**
- `accessControl.assignment.apiTesterValue` $\rightarrow$ **Giá trị**
- `accessControl.assignment.apiTesterResponseHeaders` $\rightarrow$ **Tiêu đề phản hồi**
- `accessControl.assignment.apiTesterResponseBody` $\rightarrow$ **Thân phản hồi**
- `accessControl.form.menuKey` $\rightarrow$ **Khóa menu (tuyến đường)**
- `accessControl.form.apiMethod` $\rightarrow$ **Phương thức API**
- `accessControl.form.apiPath` $\rightarrow$ **Đường dẫn API**
- `accessControl.actions.testApi` $\rightarrow$ **Kiểm thử API**
- `accessControl.actions.sendApiRequest` $\rightarrow$ **Gửi**
- `apiManagement.filters.method` / `apiManagement.table.method` / `apiManagement.form.method` $\rightarrow$ **Phương thức**
- `apiManagement.filters.module` / `apiManagement.table.module` / `apiManagement.form.module` $\rightarrow$ **Mô-đun**
- `apiManagement.table.path` / `apiManagement.form.path` $\rightarrow$ **Điểm cuối**
- `jobConsole.actions.trigger` $\rightarrow$ **Kích hoạt**
- `jobConsole.triggerModal.title` $\rightarrow$ **Kích hoạt Job**
- `controlTower.assistant.title` $\rightarrow$ **Trợ lý GPT**
- `aiAssistant.title` $\rightarrow$ **Trợ lý AI**
- `userManagement.columns.username` / `userManagement.detail.placeholders.username` $\rightarrow$ **Tên đăng nhập**
- `userManagement.userTypes.owner` $\rightarrow$ **Chủ sở hữu**
- `userManagement.userTypes.admin` $\rightarrow$ **Quản trị viên**
- `userManagement.userTypes.user` $\rightarrow$ **Người dùng**
- `momApp.layout.menu.dashboard` $\rightarrow$ **Bảng điều khiển**
- `momApp.admin.dashboard.lockedUsers.username` $\rightarrow$ **Tên đăng nhập**
- `momApp.admin.users.stats.adminOwner` $\rightarrow$ **Quản trị/Chủ sở hữu**
- `momApp.admin.users.table.username` / `momApp.admin.users.resetModal.usernameLabel` $\rightarrow$ **Tên đăng nhập**
- `momApp.admin.users.role.USER` $\rightarrow$ **Người dùng**
- `momApp.admin.users.role.ADMIN` $\rightarrow$ **Quản trị viên**
- `momApp.admin.users.role.OWNER` $\rightarrow$ **Chủ sở hữu**
- `momApp.admin.access.table.role` $\rightarrow$ **Vai trò**
- `momApp.admin.permissions.modal.menuKey` $\rightarrow$ **Khóa menu**
- `momApp.admin.permissions.modal.apiMethod` $\rightarrow$ **Phương thức API**
- `momApp.admin.permissions.modal.apiPath` $\rightarrow$ **Đường dẫn API**

---

## 3. Kết luận & Bảo trì tương lai

Với bản cập nhật này:
* **Độ phủ i18n:** Đạt **100%** đối với các khóa thực tế được gọi trong mã nguồn ứng dụng Angular.
* **Đồng bộ song ngữ:** Cả `en.json` và `vi.json` đã hoàn toàn đồng nhất về số lượng và cấu trúc khóa phân cấp.
* **Giao diện Tiếng Việt:** Không còn tình trạng trộn lẫn tiếng Anh (nhãn, nút bấm, cột bảng) trong các phân hệ quản lý người dùng, quản lý gia đình và các tính năng nghiệp vụ nâng cao.

---

## 4. Chuẩn hóa Giao diện & Hệ thống Nút bấm vai trò User

Để giải quyết triệt để sự thiếu nhất quán về giao diện (các nút bấm tự định nghĩa cục bộ, không đồng bộ về màu sắc, bo góc, bóng đổ và hiệu ứng hover) giữa các phân hệ của vai trò User (`Tasks`, `Meals`, `Baby`, `Family`, `Expenses`, `Shopping`, `Insights`, `Settings`), chúng tôi đã triển khai hệ thống nút bấm chuẩn hóa toàn cục.

### A. Định nghĩa Thiết kế Chuẩn (Design Token & Global CSS)
Tất cả các biến thiết kế toàn cục được đặt tại [src/styles.css](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/styles.css):
- **Bo góc nút (`--user-btn-radius`):** `12px`
- **Màu sắc:** Sử dụng dải màu ấm áp (cam - hồng - tím) đặc trưng của vai trò User.

Chúng tôi đã định nghĩa 3 lớp CSS tiện ích toàn cục trong `src/styles.css` đè các thuộc tính mặc định của thư viện Ant Design (`ng-zorro-antd`):

1. **Nút Primary (`.btn-user-primary`):**
   - **Nền (Background):** Gradient cam-hồng tinh tế `linear-gradient(135deg, #f97316 0%, #ec4899 100%)`.
   - **Hiệu ứng bóng đổ (Box Shadow):** `0 4px 14px rgba(236, 72, 153, 0.3)`.
   - **Hiệu ứng Hover:** Di chuyển nhẹ lên trên (`translateY(-1px)`), tăng độ bóng và giảm nhẹ opacity xuống `0.9` để tạo cảm giác phản hồi tức thì.
2. **Nút Outline (`.btn-user-outline`):**
   - **Viền & Chữ (Border & Text):** Màu cam chuẩn `var(--user-primary)` (#f97316).
   - **Nền (Background):** Trong suốt, hover chuyển sang nền cam nhạt mờ (`rgba(249, 115, 22, 0.05)`).
3. **Nút Secondary (`.btn-user-secondary`):**
   - **Nền & Viền (Background & Border):** Nền cam mờ cực kỳ sang trọng `rgba(249, 115, 22, 0.06)`, viền cam nhạt.
   - **Hover:** Tăng độ đậm của viền và nền để làm nổi bật hành động phụ.

### B. Tự động hóa Giao diện Hộp thoại (Modal Footer Buttons)
Mọi hộp thoại (modal) của User sử dụng lớp `user-role-modal` sẽ tự động kế thừa giao diện nút bấm chuẩn hóa, là bản sao hoàn hảo (identical twins) của các nút trên trang chính:
- Nút **Lưu/Xác nhận (Ok)** tự động mang thiết kế **Primary Gradient** (`.btn-user-primary`) với hiệu ứng hover `translateY(-1px)`, bo góc `12px` và đổ bóng chuẩn.
- Nút **Hủy (Cancel)** tự động mang thiết kế **Outline** (`.btn-user-outline`) viền cam chuẩn, nền trong suốt và hover chuyển sang cam mờ `rgba(249, 115, 22, 0.05)`.
Cả hai nút đều có đầy đủ định nghĩa trạng thái `[disabled]` chuẩn hóa để đảm bảo giao diện thống nhất tuyệt đối trong mọi tình huống.

### C. Dọn dẹp & Đồng bộ hóa Mã nguồn các Phân hệ
Chúng tôi đã xóa bỏ toàn bộ mã CSS cục bộ trùng lặp và chuyển đổi lớp CSS trong file template HTML của các phân hệ sau:
- **Tasks Page:** Dọn dẹp CSS cục bộ, kế thừa trực tiếp `.btn-user-primary` và `.btn-user-outline` từ styles toàn cục.
- **Shopping & Settings & Expenses & Insights Pages:** Loại bỏ các luật CSS `.btn-user-primary`, `.btn-user-outline`, `.btn-user-secondary` dư thừa.
- **Meals Page:** 
  - Đổi các nút `.btn-meals-primary`, `.btn-ai-search`, `.btn-add-to-menu` thành `.btn-user-primary` chuẩn cam-hồng.
  - Đồng bộ bo góc nút AI gợi ý (`.btn-ai-suggest`) và thêm món ăn (`.btn-add-dish`) theo tiêu chuẩn `12px`.
  - Cập nhật các hộp thoại kế thừa lớp `user-role-modal`.
- **Family Page:**
  - Đồng bộ nút chỉnh sửa thành viên `.btn-edit-member` thành `.btn-user-outline` toàn cục.
  - Chuyển các hộp thoại quản lý gia đình sang sử dụng lớp `user-role-modal`.
- **Expenses Page:**
  - Đồng bộ các nút nằm bên trong nội dung (body) của Modal quản lý hoá đơn (nút "Tải hóa đơn" sử dụng `.btn-user-primary`, nút "Tải xuống" sử dụng `.btn-user-outline`).
- **Baby Page:**
  - Chuyển nút thêm nhật ký (`.btn-gradient-primary`) và nút tải ảnh trong thư viện thành `.btn-user-primary`.
  - Đồng bộ các nút thao tác phụ ("Thêm bé", "Growth log", "Vaccination log") thành `.btn-user-outline` đồng bộ, gọn gàng.

---

## 5. Chuẩn hóa & Di chuyển Lịch sử thay đổi Premium vào Popup chuẩn Admin

Nhằm tối ưu hóa diện tích hiển thị giao diện và mang lại trải nghiệm chuyên nghiệp cho quản trị viên tại phân hệ **Cấu hình Premium** (`/admin/premium`), chúng tôi đã thiết kế và đưa tính năng xem lịch sử thay đổi Premium (Premium Audit Log) vào cấu trúc Popup (Modal) tương tác cao cấp.

### A. Thiết kế Popup Chuẩn Admin
- **Modal Wrapper (`nz-modal`):** Sử dụng cấu hình `nzWrapClassName="admin-role-modal"` đồng bộ với các modal quản trị của hệ thống.
- **Kích thước lớn (`[nzWidth]="1200"`):** Chiều rộng `1200px` giúp bảng dữ liệu Audit Log hiển thị gọn gàng, rõ ràng, không bị co giật hay tràn cột thông tin quan trọng.
- **Nút đóng góc phải & Backdrop Blur:** Modal sử dụng `[nzFooter]="null"`, cho phép đóng nhanh thông qua nút `X` hoặc click bên ngoài màn hình nền kính mờ sang trọng.
- **Style chi tiết:** Chữ được thiết kế theo hệ màu thương hiệu của Admin, các key tính năng hiển thị màu primary đậm nét và có khoảng cách micro-spacing cân đối.

### B. Tích hợp nút hành động trực quan
- **Vị trí tích hợp:** Nút bấm **Lịch sử thay đổi Premium** (kèm icon Lịch sử 🕒) được bố trí ngay tại thanh công cụ Hộ gia đình (`toolbar-actions`) bên cạnh nút "Tải lại cấu hình".
- **Cơ chế hoạt động:** Nút chỉ được kích hoạt (enabled) khi Admin đã lựa chọn một hộ gia đình cụ thể. Khi bấm vào, modal sẽ mở ra ngay lập tức và tải/hiển thị 20 dòng thay đổi entitlement gần đây nhất của gia đình đó.

