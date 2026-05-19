# Giải thích chi tiết: Giải quyết lỗi 403 Forbidden & Thiết lập Cơ chế Bypass Cô lập Dữ liệu cho Admin

Chào bạn! Hãy cùng ngồi xuống làm một ly cà phê và cùng nhìn lại câu chuyện kỹ thuật thú vị đằng sau lỗi 403 Forbidden tưởng chừng rất hiểm hóc mà chúng ta vừa giải quyết cực kỳ êm đẹp nhé.

---

## 1. Cách Tiếp cận & Lập luận (Approach & Reasoning)
Khi bạn cung cấp log lỗi 403 Forbidden từ phía Gateway khi gọi các API chi tiêu của các gia đình khác từ màn hình Admin, điểm xuất phát đầu tiên của tôi là xác định xem **ai** là người ném ra lỗi 403 này: Gateway chặn vì thiếu quyền IAM, hay bản thân Microservice con chặn vì lý do nghiệp vụ?
- Tôi đã quét database migration và thấy các API `/expense/budgets` và `/expense/expenses/summary` đã được đăng ký quyền lực đầy đủ cho các vai trò `ADMIN` và `OWNER` (role ID `2` và `3`). Như vậy Gateway đã cho phép request đi qua.
- Tiếp theo, tôi đào sâu vào mã nguồn của `expense-service` và tìm thấy dòng code:
  `DataIsolationUtil.validateFamilyAccess(familyId);`
  Đây chính là chìa khóa! Hệ thống có một cơ chế cô lập dữ liệu tuyệt đối ở mức microservice. Khi người dùng gọi API, hệ thống sẽ đối soát `familyId` với danh sách các hộ gia đình mà người dùng đó thực sự tham gia (được Gateway đính kèm qua Header `X-Family-Ids`). Đối với Admin, vì họ không tham gia vào các hộ gia đình đó, danh sách này không khớp và hệ thống trả về 403 Access Denied.
- **Giải pháp lập luận:** Một quản trị viên hệ thống có quyền tối thượng để giám sát. Họ không cần và không thể tham gia vào hàng ngàn gia đình để xem dữ liệu tài chính. Do đó, ta phải tìm cách truyền trạng thái "tài khoản này là Admin" từ Gateway xuống các Microservice con, từ đó cho phép Microservice tự động bỏ qua (bypass) bước đối soát cô lập dữ liệu này.

---

## 2. Những Con đường Không Chọn (Roads Not Taken)
Trong lúc thiết kế giải pháp, tôi đã cân nhắc một số phương án khác nhưng quyết định loại bỏ vì những lý do sau:
*   **Phương án A: Thêm Admin vào tất cả các gia đình trong DB.**
    *   *Tại sao loại bỏ:* Đây là phương án cực kỳ tồi tệ. Nó làm phình to dữ liệu quan hệ gia đình, làm sai lệch logic đếm số thành viên và phá vỡ tính nhất quán của nghiệp vụ gia đình.
*   **Phương án B: Viết một API riêng cho Admin ở expense-service không có kiểm tra DataIsolationUtil.**
    *   *Tại sao loại bỏ:* Điều này làm nhân đôi số lượng API (ví dụ `/expense/admin/budgets` song song với `/expense/budgets`), gây lãng phí mã nguồn, khó bảo trì và dễ bị sót lỗi bảo mật nếu sau này cập nhật logic API.
*   **Phương án C: Dùng gRPC hoặc gọi trực tiếp auth-service từ expense-service để kiểm tra vai trò Admin.**
    *   *Tại sao loại bỏ:* Tăng độ trễ mạng (Network Latency) do phát sinh thêm một lượt gọi mạng (Round-trip) giữa các service với nhau trên mỗi request chi tiêu, làm chậm hệ thống đáng kể.

---

## 3. Các Mảnh ghép Kết nối với nhau như thế nào? (How Things Connect)
Giải pháp tối ưu mà chúng ta chọn là **Luồng thông tin một chiều từ Gateway xuống Microservice** thông qua cơ chế Header Propagation:
1.  **Gateway (`ApiPermissionFilter`)** là nơi duy nhất kiểm tra JWT và biết chắc chắn tài khoản có phải Admin hệ thống hay không thông qua thuộc tính `access.admin()`. Chúng ta mutate request và đính kèm Header `X-User-Admin`.
2.  **Thư viện chung (`common-lib`)** đóng vai trò là "cầu nối". Thư mục này định nghĩa ThreadLocal `UserContext` để lưu giữ thông tin của request hiện tại trong suốt vòng đời của thread xử lý.
3.  **`UserContextInterceptor`** ở mỗi Microservice sẽ tự động "nhặt" Header `X-User-Admin` ra và ghi vào ThreadLocal.
4.  **`DataIsolationUtil`** ở tầng Service chỉ cần hỏi `UserContext.isAdmin()` để quyết định có cho phép bypass bước kiểm tra hay không.

Mọi thứ liên kết tuần tự, tự động và cực kỳ mượt mà!

---

## 4. Công cụ & Phương pháp sử dụng (Tools & Methods)
Chúng ta đã tận dụng triệt để:
- **ThreadLocal Java:** Cho phép truyền dữ liệu xuyên suốt các lớp xử lý (Controller, Service, Util) trong cùng một Thread mà không cần phải truyền tham số `isAdmin` thủ công qua từng signature của hàm.
- **Maven Clean Install (`mvnw clean install`):** Vì dự án là cấu trúc đa mô-đun (multi-module), việc cài đặt thư viện chung `common-lib` vào local repository là bắt buộc để các microservice con như `api-gateway` và `expense-service` có thể biên dịch đồng bộ với những thay đổi mới nhất.

---

## 5. Sự Đánh đổi (Tradeoffs)
*   **Ưu tiên:** Tính tái sử dụng cao, mã nguồn cực kỳ gọn gàng, hiệu năng tối đa (không gọi thêm API mạng).
*   **Đánh đổi:** Microservice con phải tin tưởng tuyệt đối vào thông tin Header do Gateway truyền xuống. Nếu một kẻ tấn công có thể vượt qua Gateway và gọi trực tiếp vào Microservice con bằng cách giả mạo Header `X-User-Admin: true`, họ có thể đọc được dữ liệu của mọi gia đình. Tuy nhiên, điều này đã được bảo vệ bằng việc cấu hình mạng nội bộ (mạng chỉ cho phép Gateway giao tiếp với bên ngoài, các microservice nằm trong vùng mạng kín).

---

## 6. Những Ngõ cụt & Cách sửa đổi (Mistakes & Dead Ends)
Trong quá trình biên dịch ban đầu, IDE báo lỗi `cannot find symbol class JwtService` trong `VerifyServiceImpl.java`. 
- Lúc đầu, ta có thể lo lắng rằng code bị thiếu thư viện hoặc class bị xóa.
- Tuy nhiên, sau khi chạy trình biên dịch Maven Wrapper (`.\mvnw.cmd clean compile`) ngay tại CLI, hệ thống build thành công 100%. Điều này chỉ ra rằng đây là lỗi ảo do lệch cache chỉ mục (Index Cache) của IDE. 
- *Bài học:* Luôn tin tưởng vào trình biên dịch gốc (Maven/Gradle CLI) hơn là các cảnh báo đỏ tức thời của IDE khi làm việc với các hệ thống sinh mã tự động (gRPC, Protobuf).

---

## 7. Cạm bẫy trong Tương lai cần tránh (Future Pitfalls)
Nếu sau này bạn phát phát triển thêm các vi dịch vụ mới (ví dụ: `meal-service`, `task-service`):
- **Cạm bẫy:** Quên đăng ký `UserContextInterceptor` trong cấu hình WebMvc của dịch vụ mới. Điều này dẫn đến việc `UserContext.isAdmin()` luôn trả về `false` và Admin sẽ bị lỗi 403 khi gọi API dịch vụ đó.
- **Giải pháp:** Luôn nhớ add `UserContextInterceptor` vào `InterceptorRegistry` của mọi microservice mới sử dụng thư viện chung `common-lib`.

---

## 8. Góc nhìn Chuyên gia vs Người mới (Expert vs Beginner)
*   **Người mới (Beginner):** Sẽ xu hướng sửa lỗi bằng cách viết thêm các câu lệnh `if/else` thủ công ở tầng Controller của từng service hoặc truy vấn trực tiếp bảng vai trò người dùng trong database của service đó. Điều này gây nát code và phân mảnh logic bảo mật.
*   **Chuyên gia (Expert):** Nhìn nhận bảo mật hệ thống như một đường ống (pipeline). Họ thiết lập cơ chế lọc và làm giàu thông tin (enrichment) ngay tại Gateway, sau đó tạo các cơ chế tự động hóa phân phát (propagation) thông qua ThreadLocal để tầng nghiệp vụ bên dưới luôn sạch sẽ, nhất quán và hoạt động an toàn.

---

## 9. Bài học Tái sử dụng (Transferable Lessons)
Bài học lớn nhất từ task này là **Mô hình Ủy quyền Tập trung kết hợp Thực thi Phân tán (Centralized Decider, Distributed Enforcer)**:
- Hãy để Gateway hoặc Auth Service làm nhiệm vụ phán quyết (Decider) xem người dùng có quyền gì.
- Sau đó chuyển giao các cờ trạng thái tối giản (như `X-User-Id`, `X-User-Admin`) xuống các microservice con để chúng tự thực thi phân tán (Enforcer) một cách gọn nhẹ và độc lập. Mô hình này có thể áp dụng cho bất kỳ hệ thống Microservices nào trên thế giới!

Hy vọng những chia sẻ chi tiết này sẽ giúp bạn hiểu sâu sắc bức tranh toàn cảnh của hệ thống! Chúc bạn code thật vui! ☕
