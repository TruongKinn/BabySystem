# Tài liệu Kỹ thuật: Phân hệ Đề xuất & Phê duyệt Chi tiêu Gia đình trong Popup & Phân trang từ Java Backend

Tài liệu này đặc tả chi tiết kiến trúc kỹ thuật, luồng dữ liệu (Data flow) và thiết kế giao diện (UI/UX) cho tính năng **Đề xuất & Phê duyệt Chi tiêu Gia đình** sau khi được nâng cấp lên phân trang phía Java backend (Server-side Pagination) với kích thước **4 bản ghi mỗi trang**, tích hợp trong Popup (Modal) tương tác tại trang quản lý chi tiêu (`http://localhost:4200/app/expenses`).

---

## 1. Tổng quan Nghiệp vụ & Thiết kế Hệ thống (Business & System Design)

Thay vì cắt danh sách ở phía client (Client-side Slicing), toàn bộ quy trình phân trang được chuyển giao hoàn toàn cho **Java Backend (Microservice `expense-service`)** xử lý. Điều này giúp:
*   **Tối ưu hiệu năng truyền tải:** Chỉ tải đúng 4 đề xuất cần hiển thị lên giao diện, tiết kiệm băng thông và bộ nhớ cho thiết bị client.
*   **Tính toán thống kê tập trung:** Mọi số liệu thống kê đề xuất (Chờ duyệt, Đã duyệt, Bị từ chối) được tính toán ở tầng cơ sở dữ liệu và đính kèm trong phản hồi phân trang, giúp đồng bộ hóa dữ liệu thời gian thực trên banner và trong popup.

---

## 2. Kiến trúc Backend Java (`expense-service`)

### 2.1. Lớp DTO Phản hồi tùy biến (`ProposalPageResponse.java`)

Để hỗ trợ giao diện banner hiển thị đầy đủ số liệu thống kê tổng thể trong khi danh sách đề xuất chỉ trả về 4 bản ghi, chúng tôi thiết kế DTO chuyên biệt `ProposalPageResponse`:

```java
package com.mom.expense.controller.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalPageResponse {
    private int page;
    private int size;
    private long total;
    private List<ProposalResponse> items;
    private long pendingCount;
    private long approvedCount;
    private long rejectedCount;
}
```

### 2.2. Tầng Truy vấn Dữ liệu (JPA Repository & Service)

*   **JPA Repository (`ExpenseProposalRepository.java`):** Đăng ký thêm phương thức nhận đối tượng `Pageable` để thực thi câu lệnh SQL `LIMIT` và `OFFSET` tự động:
    ```java
    Page<ExpenseProposalEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId, Pageable pageable);
    ```

*   **Nghiệp vụ Service (`ExpenseService.java`):**
    *   Truy vấn danh sách gốc để tính toán nhanh các chỉ số thống kê (Pending, Approved, Rejected).
    *   Gọi truy vấn phân trang thông qua đối tượng `PageRequest.of(page, size)`.
    *   Đóng gói dữ liệu và trả về `ProposalPageResponse`.
    ```java
    public ProposalPageResponse getProposalsPage(Long familyId, int page, int size) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        List<ExpenseProposalEntity> allProposals = expenseProposalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId);
        long pendingCount = allProposals.stream().filter(p -> "PENDING".equalsIgnoreCase(p.getStatus())).count();
        long approvedCount = allProposals.stream().filter(p -> "APPROVED".equalsIgnoreCase(p.getStatus())).count();
        long rejectedCount = allProposals.stream().filter(p -> "REJECTED".equalsIgnoreCase(p.getStatus())).count();

        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        Page<ExpenseProposalEntity> resultPage = expenseProposalRepository.findByFamilyIdOrderByCreatedAtDesc(familyId, pageRequest);
        List<ProposalResponse> items = resultPage.getContent().stream()
                .map(this::toProposalResponse)
                .toList();

        return ProposalPageResponse.builder()
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .total(resultPage.getTotalElements())
                .items(items)
                .pendingCount(pendingCount)
                .approvedCount(approvedCount)
                .rejectedCount(rejectedCount)
                .build();
    }
    ```

### 2.3. Tầng REST Controller (`ExpenseController.java`)

Đăng ký Endpoint `/api/proposals` nhận các tham số phân trang, thiết lập mặc định **4 bản ghi một trang** (`size = 4`):
```java
    @GetMapping("/proposals")
    public ApiResponse<ProposalPageResponse> getProposals(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "4") int size
    ) {
        return ApiResponse.ok("Success", expenseService.getProposalsPage(familyId, page, size));
    }
```

---

## 3. Kiến trúc Frontend (Angular & TypeScript)

### 3.1. Định nghĩa Kiểu dữ liệu & Service API (`super-app-command.service.ts`)

*   **Interface bổ sung:**
    ```typescript
    export interface ExpenseProposalPageApi {
      page: number;
      size: number;
      total: number;
      items: ExpenseProposalApi[];
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
    }
    ```
*   **API Service Call:**
    ```typescript
      getExpenseProposals(page = 0, size = 4): Observable<ExpenseProposalPageApi> {
        const params = new HttpParams()
          .set('familyId', String(this.getFamilyId()))
          .set('page', String(page))
          .set('size', String(size));
        return this.get<ExpenseProposalPageApi>('/expense/proposals', params);
      }
    ```

### 3.2. Cập nhật Logic Điều khiển (`expenses.component.ts`)

*   **Thiết lập tham số:** `proposalPageSize = 4;`
*   **Đồng bộ luồng tải Workspace:** Thay vì nhận trực tiếp mảng đề xuất, component sẽ gán dữ liệu từ `PageResponse` và lưu trữ các biến đếm thống kê:
    ```typescript
    this.expenseProposals = proposals.items;
    this.proposalTotalCount = proposals.total;
    this.pendingProposalsCount = proposals.pendingCount;
    this.approvedProposalsCount = proposals.approvedCount;
    this.rejectedProposalsCount = proposals.rejectedCount;
    ```
*   **Hàm chuyển trang chuyên biệt (`loadExpenseProposals`):** Khi người dùng nhấn chuyển trang trên thẻ phân trang của Ng-Zorro-Antd, hàm `loadExpenseProposals(pageIndex - 1, size)` sẽ được kích hoạt để gọi API Java và cập nhật lại dữ liệu đề xuất tương ứng của trang đó.

---

## 4. Kiểm tra và Nghiệm thu (Verification Checklist)

*   **Backend:** Lệnh `.\mvnw.cmd compile` biên dịch thành công 100%, tích hợp hoàn chỉnh DTO, JPA Repository Pageable, và REST Controller.
*   **Frontend:** Lệnh `npm run build` biên dịch sạch sẽ, loại bỏ hoàn toàn pipe `slice` trong file HTML, đồng bộ hoàn hảo thuộc tính `[nzTotal]` với `proposalTotalCount` từ Java.
*   **Hoạt động phân trang:** Khi mở modal, danh sách tải trang đầu tiên (4 bản ghi). Click chuyển trang thực hiện gửi tham số `page=1&size=4` xuống Java backend và render kết quả chuẩn xác.
