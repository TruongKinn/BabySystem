# Tài Liệu Hướng Dẫn Sử Dụng Spec-Kit Theo Từng Tình Huống Thực Tế (Use Cases)

Tài liệu này hướng dẫn cách áp dụng quy trình **Spec-Driven Development (SDD)** của bộ công cụ **Spec-Kit** vào các tình huống phát triển phần mềm thực tế hàng ngày trong dự án **BabySystem**.

---

## 📋 Bảng Tổng Quan Các Tình Huống (Use Cases)

| Tình huống (Use Case) | Điểm xuất phát | Các lệnh cần chạy tuần tự | Sản phẩm đầu ra chính |
| :--- | :--- | :--- | :--- |
| **1. Tính năng mới hoàn toàn** | Ý tưởng / Yêu cầu nghiệp vụ sơ khai | `/speckit-specify` ➡️ `/speckit-clarify` ➡️ `/speckit-plan` ➡️ `/speckit-tasks` ➡️ `/speckit-implement` | `spec.md`, `plan.md`, `tasks.md`, Code hoàn thiện |
| **2. Yêu cầu Thay đổi (CR)** | Chức năng cũ cần sửa/nâng cấp | Sửa `spec.md` trực tiếp ➡️ `/speckit-plan` ➡️ `/speckit-converge` ➡️ `/speckit-implement` | `tasks.md` được bổ sung Phase Convergence, Code cập nhật |
| **3. Sửa lỗi hệ thống (Bug Fix)** | Báo cáo lỗi (Bug Report) | `/speckit-specify` (Đặc tả lỗi & hành vi đúng) ➡️ `/speckit-plan` ➡️ `/speckit-tasks` ➡️ `/speckit-implement` | Bản vá lỗi chuẩn xác, test case tự động kiểm chứng |
| **4. Thử nghiệm kỹ thuật (Spike)** | Công nghệ mới chưa rõ cách dùng | `/speckit-plan` (Phase 0: Research) ➡️ Viết code thử nghiệm ➡️ Viết Spec chính thức | `research.md`, Code thử nghiệm (Prototype) |

---

## 💡 Hướng Dẫn Chi Tiết Từng Case Lâm Sàng

### Case 1: Triển Khai Tính Năng Mới Từ Đầu (New Feature Development)
*Áp dụng khi bạn nhận được một yêu cầu nghiệp vụ mới hoàn toàn chưa từng có trong hệ thống.*

*   **Bước 1: Tạo Đặc Tả Nghiệp Vụ**
    *   *Lệnh:* `/speckit-specify Thiết lập chức năng nhắc nhở uống sữa cho bé trong baby-service`
    *   *Hành động:* AI tạo thư mục `specs/NNN-milk-reminder/spec.md`. Hãy mở file ra xem và đảm bảo các yêu cầu nghiệp vụ đã đúng ý bạn.
*   **Bước 2: Giải Quyết Sự Mơ Hồ**
    *   *Lệnh:* `/speckit-clarify`
    *   *Hành động:* Bạn trả lời các câu hỏi trắc nghiệm của AI (ví dụ: Bé uống sữa định kỳ theo giờ hay theo lịch linh hoạt?). Câu trả lời sẽ tự động chèn vào mục `Clarifications` của `spec.md`.
*   **Bước 3: Lập Thiết Kế Kỹ Thuật**
    *   *Lệnh:* `/speckit-plan`
    *   *Hành động:* AI rà soát cơ sở dữ liệu `baby_db`, thiết kế bảng biểu (`data-model.md`), tạo mock API (`contracts/`) và kịch bản test (`quickstart.md`). Bạn review file `implementation_plan.md` để duyệt kiến trúc kỹ thuật.
*   **Bước 4: Tạo Check-list Tác Vụ**
    *   *Lệnh:* `/speckit-tasks`
    *   *Hành động:* AI tạo file `task.md` phân rã công việc thành các đầu việc nhỏ từ Backend đến Frontend.
*   **Bước 5: Thực Thi Code**
    *   *Lệnh:* `/speckit-implement`
    *   *Hành động:* AI tự động viết code, kiểm thử và báo cáo hoàn thành.

---

### Case 2: Nâng Cấp Hoặc Thay Đổi Yêu Cầu Tính Năng (Change Request - CR)
*Áp dụng khi tính năng đã chạy hoặc đang viết dở nhưng khách hàng/bạn muốn đổi logic hoặc thêm thuộc tính.*

*   **Bước 1: Khai báo thay đổi trong Đặc tả**
    *   *Hành động:* Mở trực tiếp file `spec.md` cũ (ví dụ: `specs/003-milk-reminder/spec.md`). Thêm dòng yêu cầu mới:
        *   `FR-005: Cho phép người dùng tắt tiếng chuông nhắc nhở và chỉ nhận notification dạng silent.`
*   **Bước 2: Cập nhật bản vẽ kỹ thuật**
    *   *Lệnh:* `/speckit-plan`
    *   *Hành động:* AI tự động đọc thuộc tính silent notification mới từ spec, cập nhật lại cấu trúc DB và API contract trong thiết kế.
*   **Bước 3: Phát hiện sự lệch pha và sinh Task tự động**
    *   *Lệnh:* `/speckit-converge`
    *   *Hành động:* AI sẽ so sánh code hiện tại với spec/plan mới. Nhận thấy tính năng "silent notification" chưa có trong code, AI tự động thêm phần `## Phase 2: Convergence` ở cuối file `tasks.md` chứa các tác vụ cụ thể để làm chức năng này.
*   **Bước 4: Code cập nhật**
    *   *Lệnh:* `/speckit-implement`
    *   *Hành động:* AI thực thi code các task vừa được thêm mới để đáp ứng đúng CR.

---

### Case 3: Sửa Lỗi Hệ Thống (Bug Fixing Workflow)
*Áp dụng khi phát hiện lỗi nghiêm trọng trong hệ thống và bạn muốn sửa một cách bài bản, tránh phát sinh lỗi phụ (Regression).*

*   **Bước 1: Đặc tả lỗi**
    *   *Lệnh:* `/speckit-specify Sửa lỗi hiển thị sai định dạng múi giờ khi gửi notification nhắc nhở`
    *   *Hành động:* AI tạo spec tập trung mô tả: Hành vi bị lỗi (Hiện tại hiển thị giờ UTC) và Hành vi đúng mong đợi (Phải tự động convert sang múi giờ của user, ví dụ GMT+7).
*   **Bước 2: Tìm nguyên nhân & Lên phương án**
    *   *Lệnh:* `/speckit-plan`
    *   *Hành động:* AI phân tích code gửi notification hiện tại, tìm ra chỗ format thiếu Locale hoặc Timezone, ghi lại phương án sửa đổi và tạo test case kiểm thử (nhập đầu vào UTC 02:00 -> đầu ra GMT+7 09:00).
*   **Bước 3: Tạo Task & Thực thi**
    *   *Lệnh:* `/speckit-tasks` tiếp tục bằng `/speckit-implement`
    *   *Hành động:* AI thực hiện sửa code, chạy thử test case xem đã pass hay chưa để đảm bảo bug được xử lý triệt để.

---

### Case 4: Nghiên Cứu & Thử Nghiệm Công Nghệ (Technical Spike)
*Áp dụng khi bạn muốn làm một tính năng nhưng chưa biết nên chọn thư viện nào, hoặc chưa biết cấu trúc Kafka kết nối thế nào.*

*   **Bước 1: Chạy Lập Kế Hoạch Nghiên Cứu**
    *   *Lệnh:* `/speckit-plan`
    *   *Hành động:* Tập trung vào **Phase 0: Outline & Research**. AI sẽ sinh ra file `research.md` so sánh các giải pháp (ví dụ: so sánh giữa WebSockets vs Server-Sent Events cho Notification real-time).
*   **Bước 2: Viết Code Prototype (Thử nghiệm)**
    *   *Hành động:* Dựa trên `research.md`, tạo một nhánh code nháp hoặc viết script chạy thử trong thư mục `scratch/` để kiểm chứng công nghệ.
*   **Bước 3: Chuyển đổi thành Spec chính thức**
    *   *Hành động:* Sau khi thử nghiệm công nghệ thành công, quay lại quy trình **Case 1** để xây dựng tính năng đó một cách chuẩn hóa vào sản phẩm.

---

## 🚀 Các Quy Tắc Vàng Để Đạt Hiệu Quả Tối Đa

1.  **Không bao giờ nhảy cóc:** Việc cố tình bỏ qua `/speckit-plan` để chạy thẳng code thường dẫn đến việc AI viết code chắp vá, không đồng bộ với cấu trúc microservices phức tạp của dự án.
2.  **Sử dụng `/speckit-analyze` định kỳ:** Trước khi hoàn thành PR, hãy chạy lệnh này để đảm bảo tài liệu spec, plan, tasks và mã nguồn thực tế hoàn toàn đồng bộ, không bị lệch pha.
3.  **Tận dụng tối đa `quickstart.md`:** File này chứa các kịch bản test thực tế. Hãy yêu cầu AI chạy các kịch bản test này ở bước implement để đảm bảo tính năng hoạt động 100% trước khi bàn giao.
