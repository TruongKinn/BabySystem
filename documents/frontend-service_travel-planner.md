# Tài liệu thiết kế: Tính năng Kế hoạch Du lịch Gia đình (Family Travel Planner)

> **Service**: Frontend Service
> **Tính năng**: Kế hoạch du lịch gia đình tích hợp bản đồ OpenStreetMap (Leaflet) và Gợi ý Hành trình từ AI Copilot.
> **Ngày cập nhật**: 2026-06-02

---

## 1. Tổng quan tính năng
Tính năng "Kế hoạch Du lịch Gia đình" (Family Travel Planner) hỗ trợ các gia đình lên kế hoạch chi tiết cho các chuyến đi của mình. Chức năng bao gồm việc quản lý các chuyến đi, đánh dấu các điểm đến trên bản đồ tương tác OpenStreetMap, sử dụng AI Copilot để lên ý tưởng hành trình thông minh dựa trên thông tin gia đình (có trẻ nhỏ), và chuẩn bị danh sách đồ dùng (Checklist) cho chuyến đi.

## 2. Thiết kế giao diện & Trải nghiệm người dùng (Premium UI/UX)
Theo chuẩn **Web Design Backbone** của dự án:
- **Tông màu**: Dựa trên Warm Palette đặc trưng của User Role (nền tối/sáng với sắc cam rực rỡ, chuyển màu gradient cam-hồng `--user-primary` và `--user-primary-light`).
- **Nút bấm (Buttons)**: Tuân thủ hệ thống class nút bấm chuẩn hóa toàn cục dành cho User:
  - Nút chính (`.btn-user-primary` kết hợp thuộc tính `nzType="primary"`): Gradient cam-hồng, hover nhô lên nhẹ.
  - Nút phụ/viền (`.btn-user-outline` kết hợp `nzType="default"` hoặc không set type): Viền cam, chữ cam, nền trong suốt.
  - Nút nhẹ (`.btn-user-secondary` kết hợp `nzType="default"`): Nền cam cực nhạt, chữ cam.
- **Bố cục (Layout)**: 
  - Giao diện Bento Grid hiển thị danh sách các chuyến đi hiện tại và tóm tắt trạng thái (số địa điểm, ngày khởi hành, trạng thái checklist).
  - Bản đồ tương tác lớn ở trung tâm, cho phép click để chọn tọa độ hoặc tìm kiếm địa điểm qua Nominatim API.
  - Sidebar bên phải hoặc tab chuyển đổi linh hoạt giữa: **Bản đồ lộ trình**, **Ý tưởng hành trình từ AI**, và **Checklist chuẩn bị đồ**.
- **Hiệu ứng & Hoạt ảnh**:
  - Hover chuyển động nhẹ (`translateY(-2px)`) cho các thẻ hành trình.
  - Lộ trình vẽ bằng nét đứt hoặc nét liền chuyển động mềm mại trên bản đồ.
  - AI Generating state với hiệu ứng sóng (pulse wave) và icon phát sáng sang trọng.

## 3. Kiến trúc kỹ thuật & Dữ liệu
### A. Cấu trúc component Angular mới (`app/travel`)
- `TravelComponent` (Standalone Component) được đăng ký tại route `/app/travel`.
- Sử dụng thư viện bản đồ **Leaflet** để render bản đồ OpenStreetMap:
  - Cài đặt: `leaflet` và `@types/leaflet`.
  - Import CSS của Leaflet vào `src/styles.css` qua `@import 'leaflet/dist/leaflet.css';`.
  - Khởi tạo bản đồ trong `ngOnInit`/`ngAfterViewInit`.
- **Nominatim API (OpenStreetMap)**: Sử dụng để tìm kiếm địa chỉ địa lý (Geocoding) trực tiếp trên Client mà không cần Google API Key, đảm bảo tính miễn phí và mã nguồn mở.

### B. Lưu trữ dữ liệu (Data Persistence)
- Các chuyến đi (`TravelPlan`) được lưu trữ bền vững trong cơ sở dữ liệu PostgreSQL của microservice `baby-service` (cổng `8087`), đảm bảo tính độc lập và phân tách dữ liệu đa người thuê thông qua thuộc tính `familyId`.
- **Cơ chế đồng bộ (Aggregate Root)**: Khi người dùng cập nhật bất kỳ thông tin nào (thêm điểm đến, sửa ghi chú, thay đổi checklist), Frontend sẽ gửi yêu cầu cập nhật toàn bộ đối tượng `TravelPlan` (`PUT /api/travel-plans/{planId}`) chứa đầy đủ danh sách điểm đến và danh sách checklist mới. Backend sẽ tự động xóa/cập nhật các bản ghi phụ thuộc (`travel_destinations` và `travel_checklist_items`) một cách an toàn thông qua tính năng `@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)` của Hibernate.

### C. Quản lý và hiển thị hình ảnh kỷ niệm (MinIO & API Gateway)
- **Tải lên hình ảnh (Upload)**:
  - Khi cắm mốc dấu đã tới trên bản đồ, người dùng có thể tải lên 1 hình ảnh kỷ niệm qua Service: `SuperAppCommandService.uploadFile(file, 'travel-plans', 'destination')`.
  - Hình ảnh thực tế (binary object) được lưu trữ trực tiếp vào **MinIO Object Storage** (cổng `9000`) qua bucket `travel-plans` thông qua microservice `file-service` (cổng `8092`).
  - Đường dẫn sạch trả về có định dạng: `${API_CONFIG.GATEWAY_URL}/file/files/{id}/view` và được lưu vào cột `image_url` của bảng `travel_destinations`.
- **Bảo mật và hiển thị ảnh (Dynamic JWT Token)**:
  - Do trình duyệt tải ảnh trực tiếp thông qua thẻ `<img>` hoặc thuộc tính CSS `background-image` (không qua Angular HttpClient), trình duyệt sẽ mặc định không đính kèm header `Authorization: Bearer <token>`. Request khi đi qua API Gateway sẽ bị chặn và trả về lỗi **403 Forbidden** hoặc **401 Unauthorized**.
  - **Giải pháp**: Tận dụng cơ chế nhận diện token qua Query Parameter được cấu hình sẵn trong API Gateway (`ApiPermissionFilter`). Frontend sử dụng phương thức helper `getSafeImageUrl(url)` để tự động đính kèm Token hiện tại của phiên đăng nhập:
    `URL_ảnh_hiển_thị = URL_ảnh_gốc?token=jwt_access_token`
  - URL lưu trữ trong CSDL hoàn toàn sạch (không kèm token), đảm bảo tính an toàn và không bị lỗi link hết hạn khi token cũ hết hiệu lực. Khi tải lại trang, Frontend sẽ tự động lấy Token mới của phiên hoạt động đính vào URL hiển thị.

### D. Tích hợp AI Copilot
- Tận dụng API `/ai/copilot/chat` từ `SuperAppCommandService` gửi prompt chuyên dụng để sinh ý tưởng hành trình.
- Cấu hình Prompt gợi ý tự động đính kèm thông tin ngữ cảnh của gia đình (như số lượng trẻ nhỏ, độ tuổi) để AI đưa ra lịch trình an toàn và hợp lý nhất cho bé.

## 4. Kế hoạch i18n
Bắt buộc tạo đầy đủ file i18n con tại thư mục `public/i18n/app/travel/` cho cả 4 ngôn ngữ:
- `vi.json` (Tiếng Việt)
- `en.json` (Tiếng Anh)
- `zh.json` (Tiếng Trung)
- `ja.json` (Tiếng Nhật)
Sau đó, chạy script `node codebase/scripts/compile-i18n.js` để tự động tích hợp vào file dịch chính.
