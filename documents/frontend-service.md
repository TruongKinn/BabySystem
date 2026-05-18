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
