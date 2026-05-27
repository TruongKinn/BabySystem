# Phân hệ Nhật ký của Bé (Baby Service) - Tính năng Bình luận Chuyên sâu

Tài liệu này mô tả chi tiết kiến trúc, luồng nghiệp vụ và thiết kế giao diện của hệ thống **Bình luận chuyên sâu (Comment & Reaction System)** thuộc phân hệ `baby-service`.

---

## 1. Tổng quan Tính năng

Hệ thống bình luận được thiết kế theo mô hình tương tác mạng xã hội hiện đại (Facebook Style), hỗ trợ:
- **Phân cấp 2 cấp**: Bình luận gốc (Root Comment) và Câu trả lời (Replies) giúp giao diện gọn gàng, trực quan.
- **Biểu cảm (Reactions)**: 6 loại biểu cảm kinh điển (Like, Love, Haha, Wow, Sad, Angry) được đồng bộ thời gian thực và lưu trữ xuống database.
- **Nhắc tên (Mention `@`)**: Cho phép tag thành viên gia đình trực tiếp khi gõ kí tự `@` và tự động gửi thông báo PUSH không đồng bộ thông qua `notification-service`.

---

## 2. Kiến trúc Backend & Cơ sở dữ liệu

### A. Sơ đồ Cơ sở dữ liệu (Flyway Migrations)
Database sử dụng PostgreSQL, được di trú tự động qua Flyway:
1. **`V2__create_baby_log_comments_table.sql`**:
   - Tạo bảng `baby_log_comments` lưu trữ thông tin bình luận.
   - Cột `parent_id` (foreign key trỏ ngược lại chính nó) thiết lập quan hệ cha-con.
   - Ràng buộc khóa ngoại kết nối với bảng `baby_logs(id)` kèm hành vi `ON DELETE CASCADE`.
2. **`V3__add_parent_id_and_reactions_table.sql`**:
   - Thêm cột `parent_id` vào bảng bình luận nếu chưa có.
   - Tạo bảng `baby_log_comment_reactions` lưu trữ biểu cảm của từng user trên từng comment.
   - Khóa duy nhất (Unique Constraint) trên cặp `(comment_id, user_id)` để đảm bảo mỗi người chỉ được thả tối đa 1 biểu cảm/bình luận.

### B. Logic Phân quyền API (Authentication Service)
Mọi API endpoint của comment đều đi qua API Gateway và được phân quyền thông qua migration `V39__add_baby_log_comments_reactions_permissions.sql` tại `authentication-service`:
- `API:POST:BABY_LOG_COMMENT_CREATE`: Cho phép tạo bình luận mới hoặc phản hồi.
- `API:GET:BABY_LOG_COMMENT_LIST`: Cho phép lấy danh sách bình luận dưới log.
- `API:DELETE:BABY_LOG_COMMENT_DELETE`: Cho phép xóa bình luận (chỉ tác giả hoặc admin).
- `API:POST:BABY_LOG_COMMENT_REACT`: Thả biểu cảm.
- `API:DELETE:BABY_LOG_COMMENT_UNREACT`: Gỡ biểu cảm.

### C. Luồng Xử lý Mention & Bắn thông báo không đồng bộ
Khi người dùng tạo bình luận có nhắc tên thành viên (`taggedUserIds` trong request):
1. `BabyLogCommentService` lưu trữ bình luận xuống CSDL.
2. Kiểm tra danh sách `taggedUserIds`. Nếu danh sách không trống, dịch vụ sẽ kích hoạt REST call không đồng bộ sang `notification-service` qua endpoint nội bộ `/api/notifications`.
3. Thông tin gửi đi chứa:
    - `userId`: ID người được tag.
    - `title`: "Bạn được nhắc đến trong một bình luận".
    - `message`: Chứa thông báo người tag, tên bé và trích xuất trực tiếp nội dung bình luận thực tế (cắt ngắn tối đa 150 ký tự có dấu `...` để hiển thị hoàn hảo trên chuông báo PUSH).
    - `type`: `MENTION` (để trigger chuông báo PUSH/Websocket hiển thị lập tức).

---

## 3. Kiến trúc Frontend Angular

Giao diện bình luận được tách biệt hoàn toàn thành một Standalone Component để đảm bảo tính tái sử dụng và cô lập mã nguồn:

### A. Standalone Component: `BabyCommentsComponent`
- **Tập tin**: `baby-comments.component.ts`, `.html`, `.css`
- **Input nhận vào**:
  - `logId`: ID dòng nhật ký cần load bình luận.
  - `babyId`: ID của bé hiện tại.
  - `familyMembers`: Danh sách chi tiết thành viên gia đình nạp từ cha.
- **Quy tắc Phân cấp (Facebook Style)**:
  - Chỉ có tối đa **2 cấp** hiển thị.
  - Mọi reply cho comment con sẽ tự động được gán `parentId` trỏ về comment gốc để giữ cấu trúc phẳng ở cấp 2, tránh hiện tượng thụt lề quá sâu gây vỡ layout trên mobile.
  - Thụt lề `margin-left: 44px` đối với danh sách câu trả lời ở desktop (co lại còn `24px` ở mobile).

### B. Thuật toán Trực quan Nhắc tên (Mention Tagging `@`)
Khi người dùng gõ vào ô input:
1. Lắng nghe sự kiện `input` và kiểm tra vị trí con trỏ chuột (`selectionStart`).
2. Tìm kiếm ký tự `@` gần nhất trước con trỏ. Nếu sau ký tự `@` không có khoảng trắng, kích hoạt gợi ý (`showMentionDropdown = true`).
3. Lọc danh sách thành viên gia đình (`familyMembers`) theo từ khóa sau ký tự `@`.
4. Khi người dùng click chọn thành viên:
   - Thay thế đoạn `@từ_khóa` bằng `@Tên_Thành_Viên ` (có dấu cách ở cuối).
   - Đưa `userId` của người được tag vào mảng `taggedUserIds`.
   - Focus lại vào ô nhập liệu và đưa con trỏ ra sau dấu cách vừa chèn để người dùng viết tiếp cực kỳ tự nhiên.
5. Khi submit, API sẽ nhận đầy đủ `content` chứa các tag text và mảng ID người nhận thực tế `taggedUserIds`.

### C. Trải nghiệm Biểu cảm (Reactions Popover Bar)
- **UI/UX cao cấp**: Khi rê chuột (hover) qua nút "Thích", một thanh Popover Bar chứa 6 biểu cảm kinh điển (👍, ❤️, 😆, 😮, 😢, 😡) sẽ bay nổi nhẹ nhàng từ dưới lên nhờ hiệu ứng CSS transition nảy (`@keyframes slideUpBounce` và `bounceIn`).
- Hover từng emoji sẽ phóng to `scale(1.35) translateY(-5px)` và hiện tooltip chú giải mượt mà.
- **Optimistic UI**: Khi click chọn biểu cảm, trạng thái `myReaction` và số lượng `reactionCounts` của comment sẽ lập tức được cập nhật trực quan trên màn hình trước khi API phản hồi để tạo cảm giác phản hồi tức thì tuyệt hảo (Alive Interface). Gọi API react/unreact ngầm bên dưới, rollback tự động nếu có lỗi xảy ra.
- **Gom nhóm Reaction**: Gom tối đa 3 loại biểu cảm được thả nhiều nhất để vẽ cụm icon đè lên nhau ở góc dưới bong bóng trò chuyện giống như Facebook.
