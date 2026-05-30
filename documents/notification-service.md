# Tài liệu dịch vụ: Hướng dẫn xử lý lỗi kết nối Vault 403 Forbidden cho Notification Service

Tài liệu này ghi nhận sự cố lỗi phân quyền HashiCorp Vault (`Status 403 Forbidden`) đối với dịch vụ `notification-service` và giải pháp khắc phục.

## Sự cố

Khi chạy `notification-service` ở môi trường local, ứng dụng bị lỗi startup:
```
org.springframework.vault.VaultException: Status 403 Forbidden [secret/notification-service]: permission denied
	at org.springframework.vault.client.VaultResponses.buildException(VaultResponses.java:84)
```

## Nguyên nhân

1. Dịch vụ được tích hợp với Spring Cloud Vault để đọc các config từ Vault Server đang chạy tại `http://localhost:8200`.
2. Theo cấu hình mặc định trong `application.yml`:
   ```yaml
   spring:
     cloud:
       vault:
         token: ${VAULT_TOKEN:root}
   ```
   Nếu không chỉ định biến môi trường `VAULT_TOKEN`, Spring Boot sẽ lấy giá trị mặc định là `root`.
3. Tuy nhiên, Vault Server được khởi tạo tự động qua script bootstrap đã tạo ra một token ngẫu nhiên thay vì sử dụng token `root`. Token thực tế được lưu tại:
   `codebase/infrastructure/vault/cluster-keys.json`
   Trong trường `"root_token"`.
4. Việc sử dụng token mặc định `root` để kết nối vào Vault dẫn đến lỗi `403 Forbidden`.

## Giải pháp khắc phục

Để bảo mật tuyệt đối cho dự án (tránh rò rỉ secret lên Git khiến GitHub Push Protection chặn push), chúng ta **không** hardcode token thực tế vào tệp cấu hình `application.yml`. Thay vào đó, áp dụng các phương pháp an toàn dưới đây:

### Cách 1: Sử dụng Script tự động khởi chạy (Khuyên dùng)
Tôi đã tạo sẵn một script PowerShell tại thư mục gốc của dự án:
👉 `run-notification-service.ps1`

Script này sẽ tự động đọc token ngẫu nhiên từ file `cluster-keys.json` và truyền vào biến môi trường hệ thống trước khi start `notification-service`. Bạn chỉ cần mở PowerShell và chạy:
```powershell
./run-notification-service.ps1
```

### Cách 2: Thiết lập Biến Môi trường thủ công
Nếu muốn chạy trực tiếp từ Terminal hoặc cấu hình biến môi trường trong IDE (IntelliJ, Eclipse), hãy lấy Token thực tế từ tệp `codebase/infrastructure/vault/cluster-keys.json` (giá trị của `"root_token"`).

- **Trong PowerShell**:
  ```powershell
  $env:VAULT_TOKEN="<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>"
  mvn spring-boot:run
  ```
- **Trong CMD**:
  ```cmd
  set VAULT_TOKEN=<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>
  mvn spring-boot:run
  ```
- **Trong Linux/Bash**:
  ```bash
  export VAULT_TOKEN=<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>
  mvn spring-boot:run
  ```
- **Trong IntelliJ IDEA**:
  Mở cấu hình Run/Debug của dịch vụ, thêm biến môi trường (Environment Variables):
  `VAULT_TOKEN=<YOUR_VAULT_TOKEN_FROM_CLUSTER_KEYS>`

---

## Cơ chế Lọc Thông báo Admin & WebSocket Real-time cho Premium Request (userId = null)

### 1. Sự cố
Khi User gửi yêu cầu mở khóa Premium (Premium Baby Journey+), một thông báo loại `INFO` được tạo ra với thuộc tính `userId = null` để biểu thị đây là thông báo hệ thống gửi chung cho Admin phê duyệt. Tuy nhiên, Admin lại gặp phải các vấn đề sau:
- **REST API Load**: Không thấy thông báo trong danh sách chuông của Admin.
- **WebSocket Real-time**: Không có thông báo nhảy số hay cập nhật thời gian thực khi User gửi yêu cầu.

### 2. Nguyên nhân
- **REST API Filter**: Trong file `NotificationService.java` của Backend, khi gọi API `/api/notifications?familyId=X&userId=Y` với `userId` khác null, backend sẽ thực hiện lọc chỉ lấy các thông báo có `familyId` và `userId` trùng khớp. Do Premium Request có `userId = null`, nó bị lọc mất khi Admin truyền `userId` của mình lên.
- **WebSocket Topic**: Backend dispatch WebSocket thông qua destination `/topic/notifications/user/{userId}`. Với `userId = null`, backend push tới `/topic/notifications/user/null`. Trong khi đó, Admin chỉ subscribe topic cá nhân `/topic/notifications/user/{adminUserId}` nên không bao giờ nhận được.

### 3. Giải pháp Khắc phục tại Front-End

Chúng tôi đã tối ưu hóa logic tại Front-End để giải quyết triệt để vấn đề mà không cần sửa đổi Back-End:

1. **REST API (`NotificationBellComponent`)**:
   Khi người dùng hiện tại là Admin (`this.authService.isAdminUser() === true`), frontend sẽ tự động loại bỏ tham số `userId` khi gọi API lấy danh sách và đếm số lượng chưa đọc. Backend lúc này sẽ nhận `userId` null và trả về tất cả thông báo của Family (bao gồm thông báo yêu cầu Premium có `userId = null`).
   
2. **WebSocket Real-time (`NotificationWebsocketService`)**:
   Khi kết nối WebSocket, nếu xác định người dùng hiện tại là Admin, client sẽ tự động subscribe thêm vào topic hệ thống:
   `_destination = /topic/notifications/user/null`
   
Nhờ giải pháp này, Admin giờ đây có thể nhìn thấy mọi thông báo yêu cầu phê duyệt trong chuông và nhận được cập nhật tức thì dưới dạng thời gian thực (real-time) mà không cần tải lại trang.

---

## Cơ chế Bảo mật & Lọc Thông báo Riêng tư ở Front-End (Client-Side Filtering)

### 1. Vấn đề phát sinh
Khi Admin gọi API lấy thông báo mà không truyền `userId` (để có thể nhận thông báo yêu cầu kích hoạt Premium có `userId = null`), backend sẽ trả về **tất cả thông báo của Family**. 
Điều này dẫn đến một lỗ hổng trải nghiệm: Khi Admin gửi thông báo phản hồi (ví dụ: *"Premium đã được kích hoạt!"* hoặc *"Yêu cầu bị từ chối"*) gửi riêng cho `requestUserId` của User A, thông báo đó có `familyId` chung nên Admin cũng nhìn thấy nó xuất hiện trong chuông của mình! Nói cách khác, Admin nhận được cả thông báo riêng tư gửi cho User khác.

### 2. Giải pháp Khắc phục tại Front-End

Chúng tôi đã thiết lập cơ chế **Client-Side Filtering (Lọc ở Client)** chặt chẽ cho tài khoản Admin:

1. **Bổ sung `userId` vào `NotificationItem`**:
   Định nghĩa thêm thuộc tính `userId` trong interface dữ liệu Front-End để lưu vết người nhận đích thực của thông báo.

2. **Lọc danh sách hiển thị (`loadNotifications`)**:
   Khi Admin tải thông báo, Front-End sẽ lọc danh sách nhận về từ API và chỉ giữ lại những thông báo thỏa mãn một trong hai điều kiện:
   *   `userId === null`: Thông báo hệ thống/Yêu cầu Premium gửi chung cho ban quản trị.
   *   `userId === adminUserId`: Thông báo gửi riêng cho chính Admin đó.
   *   *Mọi thông báo gửi riêng cho User khác (`userId !== null` và `userId !== adminUserId`) sẽ bị bỏ qua hoàn toàn.*

3. **Lọc WebSocket Real-time**:
   Khi có thông báo mới push qua WebSocket, nếu là Admin, hệ thống kiểm tra `userId` của tin nhắn đó. Nếu không phải thông báo hệ thống và không phải của Admin, tin nhắn sẽ bị bỏ qua ngay lập tức để tránh thông báo nhảy số sai lệch.

4. **Đếm số lượng chưa đọc chính xác (`loadUnreadCount`)**:
   Để tránh việc số lượng chưa đọc trên chuông của Admin bị tính sai (cộng dồn cả thông báo chưa đọc của các User khác), khi người dùng là Admin, hàm `loadUnreadCount()` sẽ tự động tải danh sách và thực hiện đếm trực tiếp trên tập dữ liệu đã được lọc sạch ở client thay vì gọi API đếm tổng thô của Family.

Nhờ những cải tiến này, hệ thống thông báo đạt được tính riêng tư tuyệt đối giữa User và Admin: **Ai gửi yêu cầu thì nhận kết quả phê duyệt của người đó, Admin không bị làm phiền bởi các thông báo phản hồi do chính mình tạo ra.**

---

## Giải phóng Trạng thái Chờ duyệt khi bị Từ chối (PREMIUM_REJECTED)

### 1. Vấn đề phát sinh
Khi User click gửi yêu cầu mở khóa Premium, hệ thống chuyển sang trạng thái pending (`isRequestPending = true`) và lưu trạng thái này vào `localStorage` của trình duyệt. 
Khi Admin bấm **"Từ chối"** (`PREMIUM_REJECTED`), thông báo từ chối được gửi tới User. Tuy nhiên, Front-End của User ở trang Journey lúc này vẫn bị khóa ở trạng thái *"Đang chờ Admin duyệt..."* vì:
- WebSocket của trang Journey chỉ lắng nghe sự kiện mở khóa thành công (`PREMIUM_APPROVED`) mà chưa xử lý sự kiện bị từ chối (`PREMIUM_REJECTED`).
- Khi User F5/tải lại trang, trạng thái trong `localStorage` vẫn là `true` nên nút bấm vẫn bị khóa vô thời hạn, không cho phép User thực hiện gửi lại yêu cầu mới.

### 2. Giải pháp Khắc phục tại Front-End

Chúng tôi đã tích hợp cơ chế đồng bộ hóa kép để giải phóng trạng thái pending cho User ngay khi bị từ chối:

1. **Xử lý sự kiện từ chối Real-time (WebSocket)**:
   Trong `ngOnInit()` của [journey.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/journey/journey.component.ts), bổ sung nhánh rẽ xử lý cho sự kiện `PREMIUM_REJECTED`:
   *   Nếu nhận được loại thông báo này, hệ thống đặt `this.isRequestPending = false`.
   *   Xóa bỏ key pending trong `localStorage` (`premium_request_pending_X`).
   *   Hiển thị thông báo warning phản hồi trực quan trên màn hình để User biết yêu cầu của họ đã bị từ chối, giúp User ngay lập tức có thể bấm gửi lại yêu cầu mới nếu cần.

2. **Dọn dẹp tự động khi tải trang (REST API)**:
   Trong `loadNotifications()` của [notification-bell.component.ts](file:///d:/AI-AGENT/BabySystem/codebase/frontend/src/app/shared/components/notification-bell/notification-bell.component.ts) (là component chạy toàn cục trên Header):
   *   Khi danh sách thông báo được tải về thành công (F5/Tải trang), hệ thống sẽ rà quét toàn bộ tin nhắn.
   *   Nếu phát hiện bất kỳ thông báo phản hồi kết quả nào từ Admin (bao gồm cả `PREMIUM_APPROVED` và `PREMIUM_REJECTED`) thuộc Family hiện tại, Front-End sẽ **tự động dọn dẹp sạch key pending trong `localStorage`**.
   *   Điều này đảm bảo rằng ngay cả khi User đang offline lúc Admin bấm từ chối, khi User truy cập lại trang hệ thống thì nút "Mở khóa Premium" vẫn sẽ được khôi phục về trạng thái ban đầu, cho phép click gửi lại yêu cầu bình thường.
