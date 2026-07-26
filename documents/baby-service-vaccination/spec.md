# Feature Specification: Baby Vaccination Tracker

**Feature Branch**: `001-baby-vaccination-tracker`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "Tạo chức năng mới quản lý tiêm chủng cho trẻ em với vai trò Admin và User."

## Clarifications

### Session 2026-07-26

- Q: Quy định phân quyền truy cập thông tin tiêm chủng của bé giữa các tài khoản người dùng như thế nào? → A: Ràng buộc quyền truy cập theo Family ID (Chỉ bố mẹ/người thân trong cùng gia đình mới có quyền xem và cập nhật lịch sử tiêm chủng của bé).
- Q: Quy tắc nào được sử dụng để xác định hai bản ghi lịch sử tiêm chủng của cùng một bé là trùng lặp? → A: Khớp đồng thời Vaccine ID và Dose Number (Mũi tiêm số mấy của loại vắc-xin đó).
- Q: Khi một mũi tiêm bị trễ/hoãn và ngày tiêm thực tế bị lùi lại, hệ thống sẽ tính toán ngày tiêm dự kiến cho các mũi tiếp theo của loại vắc-xin đó như thế nào? → A: Tự động tính lại dựa trên Ngày tiêm thực tế của mũi trước + Khoảng cách tối thiểu (actualDate + minDaysSincePreviousDose).
- Q: Các kênh truyền thông điệp nhắc lịch tiêm chủng nào sẽ được hỗ trợ chính thức và thời điểm chạy tác vụ quét hằng ngày là khi nào? → A: Gửi qua Web Push và Email. Cron Job quét hằng ngày lúc 07:00 sáng (giờ Việt Nam).
- Q: Khi AI OCR không thể nhận diện được thông tin từ ảnh sổ tiêm, hệ thống nên xử lý như thế nào để hỗ trợ người dùng tốt nhất? → A: Thông báo lỗi thân thiện, gợi ý tải lại ảnh hoặc chuyển hướng nhanh sang Form nhập liệu thủ công.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đăng ký lịch sử tiêm chủng và theo dõi lộ trình khuyến nghị (Priority: P1)

Cha mẹ (User) có thể quản lý hồ sơ tiêm chủng của con mình, xem lịch trình vắc-xin khuyến nghị dựa trên độ tuổi của bé và đánh dấu các mũi đã tiêm.

**Why this priority**: Đây là tính năng cốt lõi của MVP, giúp người dùng có giá trị ngay lập tức bằng việc số hóa sổ tiêm chủng của con và biết được con cần tiêm những mũi gì tiếp theo.

**Independent Test**: Có thể test độc lập bằng cách: Đăng nhập tài khoản User, truy cập hồ sơ em bé, chọn mục "Tiêm chủng", xem danh sách lộ trình vắc-xin gợi ý và nhấn "Đánh dấu đã tiêm" cho một mũi vắc-xin bất kỳ, kiểm tra trạng thái mũi tiêm đó được cập nhật thành công.

**Acceptance Scenarios**:

1. **Given** User đã đăng nhập và đã tạo hồ sơ em bé 3 tháng tuổi, **When** User truy cập màn hình "Sổ tiêm chủng" của bé, **Then** Hệ thống hiển thị danh sách các mũi vắc-xin khuyến nghị cho trẻ từ 0 - 3 tháng tuổi kèm trạng thái "Chưa tiêm".
2. **Given** User đang ở màn hình "Sổ tiêm chủng" của bé, **When** User chọn mũi vắc-xin "Lao (BCG)" và nhấn "Đánh dấu đã tiêm" đồng thời nhập ngày tiêm thực tế, **Then** Hệ thống cập nhật trạng thái mũi tiêm thành "Đã tiêm" và lưu lại ngày tiêm.
3. **Given** User đang ở màn hình "Sổ tiêm chủng" của bé, **When** User xem danh sách vắc-xin, **Then** Các mũi tiêm quá hạn khuyến nghị nhưng chưa được đánh dấu "Đã tiêm" sẽ được hiển thị cảnh báo "Quá hạn" màu đỏ nổi bật.

---

### User Story 2 - Quản lý danh mục vắc-xin và cấu hình lộ trình (Priority: P1)

Quản trị viên (Admin) có thể quản lý danh mục các loại vắc-xin trong hệ thống và cấu hình lộ trình tiêm khuyến nghị (độ tuổi thích hợp, số mũi cần tiêm, khoảng cách tối thiểu giữa các mũi).

**Why this priority**: Cần có dữ liệu danh mục vắc-xin chuẩn do Admin cấu hình thì hệ thống mới có thể hiển thị lộ trình khuyến nghị chính xác cho User.

**Independent Test**: Có thể test độc lập bằng cách: Đăng nhập tài khoản Admin, truy cập cổng quản trị (Admin Portal), tạo mới một loại vắc-xin và thiết lập độ tuổi khuyến nghị, sau đó kiểm tra xem loại vắc-xin đó có xuất hiện trong danh sách cấu hình hệ thống hay không.

**Acceptance Scenarios**:

1. **Given** Admin đã đăng nhập vào cổng quản trị, **When** Admin tạo mới vắc-xin "6 trong 1 (Infanrix Hexa)" với các thông tin: Tên vắc-xin, Nhà sản xuất, Mô tả bệnh phòng ngừa, Số mũi tiêm bắt buộc (3 mũi), **Then** Hệ thống lưu vắc-xin mới vào cơ sở dữ liệu và hiển thị thông báo thành công.
2. **Given** Admin đang xem chi tiết vắc-xin "6 trong 1", **When** Admin thiết lập lộ trình khuyến nghị: Mũi 1 lúc 2 tháng tuổi, Mũi 2 lúc 3 tháng tuổi, Mũi 3 lúc 4 tháng tuổi, khoảng cách tối thiểu giữa các mũi là 28 ngày, **Then** Hệ thống lưu cấu hình lộ trình này và áp dụng cho tất cả hồ sơ trẻ em trên hệ thống.

---

### User Story 3 - Nhắc lịch tiêm chủng tự động (Priority: P2)

Hệ thống tự động gửi thông báo nhắc nhở lịch tiêm sắp tới cho cha mẹ để không bị bỏ lỡ hoặc trễ lịch tiêm của con.

**Why this priority**: Tăng tính tương tác chủ động của ứng dụng, giúp cha mẹ luôn cập nhật lịch tiêm đúng hạn, tối ưu hóa sức khỏe cho bé.

**Independent Test**: Có thể test độc lập bằng cách giả lập thời gian hệ thống tiến sát đến ngày tiêm dự kiến của em bé (còn 3 ngày và 1 ngày), kiểm tra xem message nhắc lịch có được gửi qua Kafka và kích hoạt Notification Service để hiển thị thông báo cho User hay không.

**Acceptance Scenarios**:

1. **Given** Bé có lịch tiêm mũi "Phế cầu (Synflorix)" tiếp theo vào ngày 29/07/2026, **When** Thời gian hệ thống đạt đến ngày 26/07/2026 (trước 3 ngày), **Then** Hệ thống tự động gửi thông báo đẩy (Push Notification) và Email nhắc lịch cho cha mẹ: "Bé [Tên Bé] có lịch tiêm vắc-xin Phế cầu vào ngày 29/07/2026. Bố mẹ hãy chuẩn bị nhé!".

---

### User Story 4 - Tự động quét sổ tiêm chủng giấy bằng AI OCR (Priority: P3)

Cha mẹ có thể tải lên hình ảnh sổ tiêm chủng giấy của bé, hệ thống sử dụng AI để tự động phân tích, trích xuất lịch sử tiêm chủng và lưu vào hồ sơ số hóa.

**Why this priority**: Tiết kiệm thời gian nhập liệu thủ công cho cha mẹ khi mới bắt đầu sử dụng app nếu con đã tiêm nhiều mũi trước đó.

**Independent Test**: Đăng nhập User, tải lên ảnh mẫu trang sổ tiêm chủng của trẻ, kiểm tra xem AI có trích xuất đúng tên vắc-xin và ngày tiêm, hiển thị bảng xem trước (preview) để User xác nhận và lưu.

**Acceptance Scenarios**:

1. **Given** User ở màn hình "Nhập nhanh bằng AI", **When** User chụp và tải lên hình ảnh trang sổ tiêm chủng rõ nét, **Then** Hệ thống gửi ảnh qua AI Service để phân tích và hiển thị danh sách các mũi tiêm được phát hiện gồm: Tên vắc-xin, Ngày tiêm để User xác nhận trước khi lưu.

### Edge Cases

- **Xử lý mũi tiêm bị hoãn hoặc tiêm muộn**: Nếu bé bị ốm và phải hoãn tiêm, cha mẹ có thể nhấn "Hoãn tiêm" và cập nhật ngày hẹn tiêm mới. Hệ thống sẽ tự động dời lịch nhắc nhở và tính lại lịch dự kiến cho các mũi tiếp theo của loại vắc-xin đó (đảm bảo khoảng cách tối thiểu giữa các mũi).
- **Trùng lặp dữ liệu**: Nếu User cập nhật thủ công một mũi tiêm trùng với mũi tiêm đã được AI quét thành công trước đó, hệ thống phải hiển thị hộp thoại cảnh báo trùng lặp và yêu cầu xác nhận ghi đè hoặc bỏ qua.
- **Thất bại khi nhận diện AI OCR**: Khi chất lượng hình ảnh sổ tiêm giấy không đạt yêu cầu (mờ, ngược sáng) khiến AI Service trả về danh sách trống hoặc độ tin cậy thấp, hệ thống phải hiển thị cảnh báo thân thiện và hiển thị tuỳ chọn chuyển hướng nhanh sang Form nhập tay thủ công nhằm tránh gây nghẽn tiến trình của User.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST hiển thị lộ trình tiêm chủng khuyến nghị mặc định theo độ tuổi (từ sơ sinh đến 5 tuổi) cho mỗi hồ sơ em bé dựa trên giới tính và ngày sinh.
- **FR-002**: Người dùng MUST có thể cập nhật trạng thái của từng mũi tiêm: "Chưa tiêm", "Đã tiêm" (kèm ngày tiêm, cơ sở tiêm chủng, phản ứng sau tiêm) hoặc "Hoãn tiêm".
- **FR-003**: Hệ thống MUST tự động tính toán ngày tiêm dự kiến cho mũi tiếp theo của cùng một loại vắc-xin bằng cách lấy Ngày tiêm thực tế của mũi trước cộng với Số ngày giãn cách tối thiểu cấu hình bởi Admin (`actualDate + minDaysSincePreviousDose`), đảm bảo khoảng cách an toàn y khoa.
- **FR-004**: Admin MUST có quyền tạo mới, chỉnh sửa và ẩn/xóa thông tin vắc-xin cũng như cấu hình lộ trình khuyến nghị (độ tuổi tiêm, số lượng mũi, thời gian giãn cách giữa các mũi).
- **FR-005**: Hệ thống MUST tự động quét hằng ngày lúc 07:00 sáng để tìm các em bé có lịch tiêm dự kiến trong vòng 3 ngày tới và gửi sự kiện nhắc lịch sang `notification-service` thông qua Kafka Event Broker nhằm kích hoạt đồng thời Web Push và Email nhắc nhở cho người dùng.
- **FR-006**: AI Service MUST có khả năng xử lý hình ảnh sổ tiêm chủng, trích xuất thông tin dạng cấu trúc (Tên vắc-xin, Ngày tiêm) với độ chính xác tối thiểu 85% đối với chữ in và chữ viết tay rõ ràng.
- **FR-007**: Hệ thống MUST cô lập dữ liệu tiêm chủng của từng em bé theo Family ID. Chỉ các tài khoản người dùng thuộc cùng Family ID (được xác thực thông qua account-service) mới có quyền xem (Read) và cập nhật (Write) hồ sơ tiêm chủng của bé.
- **FR-008**: Hệ thống MUST tự động kiểm tra và ngăn chặn trùng lặp lịch sử tiêm chủng bằng cách đối chiếu cặp (Vaccine ID, Dose Number) cho từng em bé. Khi phát hiện trùng lặp, hệ thống phải cảnh báo và cho phép người dùng ghi đè hoặc hủy bỏ thao tác.

### Key Entities *(include if feature involves data)*

- **Vaccine**: Đại diện cho một loại vắc-xin trong hệ thống.
  - Các thuộc tính chính: `id`, `name` (Tên vắc-xin), `manufacturer` (Nhà sản xuất), `diseasePrevented` (Bệnh phòng ngừa), `totalDoses` (Tổng số mũi tiêm), `description` (Mô tả chi tiết), `isActive` (Trạng thái hoạt động).
- **VaccineScheduleConfig**: Cấu hình lộ trình khuyến nghị cho từng loại vắc-xin do Admin thiết lập.
  - Các thuộc tính chính: `id`, `vaccineId` (Liên kết với Vaccine), `doseNumber` (Số thứ tự mũi), `recommendedAgeMonths` (Độ tuổi khuyến nghị tính bằng tháng), `minDaysSincePreviousDose` (Số ngày giãn cách tối thiểu so với mũi trước).
- **BabyVaccinationHistory**: Lịch sử tiêm chủng thực tế của từng em bé.
  - Các thuộc tính chính: `id`, `babyId` (Mã em bé), `vaccineId` (Mã vắc-xin), `doseNumber` (Mũi tiêm số), `status` (Trạng thái: PENDING, COMPLETED, POSTPONED), `plannedDate` (Ngày tiêm dự kiến), `actualDate` (Ngày tiêm thực tế), `facility` (Nơi tiêm), `postVaccinationReaction` (Phản ứng sau tiêm), `notes` (Ghi chú).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cha mẹ có thể ghi nhận trạng thái đã tiêm của một mũi vắc-xin trong thời gian dưới 10 giây (tối đa 3 lần click chuột/chạm màn hình).
- **SC-002**: Tỷ lệ trích xuất chính xác thông tin từ ảnh chụp sổ tiêm chủng của AI Service đạt tối thiểu 85% đối với các ảnh chụp thẳng, đủ ánh sáng và không bị mờ nhòe.
- **SC-003**: 100% các sự kiện nhắc lịch tiêm chủng trước 3 ngày được hệ thống phát hiện chính xác và gửi thông báo thành công đến đúng tài khoản của cha mẹ trước 8:00 sáng ngày nhắc lịch.
- **SC-004**: Biểu đồ lộ trình tiêm chủng và các trạng thái tiêm chủng tải đầy đủ trên giao diện web/mobile trong vòng dưới 1.5 giây.

## Assumptions

- **A-001**: Hệ thống sẽ tái sử dụng cấu trúc xác thực và phân quyền dựa trên Keycloak hiện tại để phân biệt quyền User và Admin.
- **A-002**: Việc lưu trữ hình ảnh sổ tiêm chủng tải lên sẽ sử dụng File Service kết nối với MinIO S3 Storage có sẵn.
- **A-003**: Dữ liệu lộ trình tiêm chủng khuyến nghị ban đầu sẽ được tham chiếu theo lịch tiêm chủng mở rộng quốc gia của Bộ Y tế Việt Nam.
- **A-004**: Việc gửi thông báo đẩy và email nhắc lịch sẽ thông qua tích hợp sẵn có của Notification Service.
