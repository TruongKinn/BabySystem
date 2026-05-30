# Tài liệu Kỹ thuật: Giải pháp Phân trang Kho Hóa đơn & Chi tiêu (expense-service)

Tài liệu này giải thích chi tiết kiến trúc giải pháp phân trang đồng bộ từ Backend và Frontend dành cho phân hệ quản lý chi tiêu và hóa đơn chứng từ giao dịch (`expense-service`).

## 1. Kiến trúc Giải pháp

Để tối ưu hóa hiệu năng truyền tải dữ liệu và nâng cao trải nghiệm người dùng đối với các gia đình có lịch sử chi tiêu lớn, chúng tôi đã triển khai giải pháp phân trang đồng bộ (BE-driven pagination) kết hợp hiển thị thông tin dạng Dialog (Modal).

```
   [Angular Frontend]                                        [Spring Boot Backend]
    ExpensesComponent                                          ExpenseController
           │                                                           │
           │ ─── GET /expense/expenses?page=0&size=10&... ───────────> │
           │                                                           │ ─── queryPage ───> ExpenseService
           │                                                           │                         │
           │ <─── PageResponse<ExpenseResponse> ────────────────────── │ <─── Page<Entity> ──────┘
           ▼
  Render <nz-pagination>
```

---

## 2. Chi tiết Triển khai ở Backend

### A. Tầng Repository (`ExpenseRepository.java`)
Chúng tôi đã khai báo thêm các phương thức JPA Query hỗ trợ tham số phân trang `Pageable` và trả về một đối tượng `Page<ExpenseEntity>` có sẵn thông tin về tổng số trang, tổng số bản ghi và danh sách dữ liệu thực tế của trang hiện tại:

```java
Page<ExpenseEntity> findByFamilyIdOrderBySpentAtDesc(Long familyId, Pageable pageable);
Page<ExpenseEntity> findByFamilyIdAndCategoryIdOrderBySpentAtDesc(Long familyId, Long categoryId, Pageable pageable);
Page<ExpenseEntity> findByFamilyIdAndSpentAtBetweenOrderBySpentAtDesc(Long familyId, OffsetDateTime from, OffsetDateTime to, Pageable pageable);
Page<ExpenseEntity> findByFamilyIdAndCategoryIdAndSpentAtBetweenOrderBySpentAtDesc(Long familyId, Long categoryId, OffsetDateTime from, OffsetDateTime to, Pageable pageable);
```

### B. Tầng Service (`ExpenseService.java`)
Chúng tôi đã thêm phương thức `getExpensesPage` thực hiện logic:
1. Xác thực quyền truy cập dữ liệu của hộ gia đình hiện tại (`DataIsolationUtil.validateFamilyAccess`).
2. Khởi tạo đối tượng `PageRequest` dựa trên chỉ số trang (0-indexed) và kích thước trang.
3. Triệu gọi các phương thức repository tương ứng dựa trên bộ lọc danh mục và tháng.
4. Ánh xạ danh sách Entity thành DTO Response và đóng gói vào đối tượng `PageResponse`.

```java
public PageResponse<ExpenseResponse> getExpensesPage(Long familyId, String month, Long categoryId, int page, int size) {
    DataIsolationUtil.validateFamilyAccess(familyId);
    PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
    Page<ExpenseEntity> resultPage;
    
    // Logic tìm kiếm phân trang theo tháng & category...
    
    Map<Long, String> categoryNameMap = loadCategoryNames(resultPage.getContent());
    List<ExpenseResponse> items = resultPage.getContent().stream()
            .map(expense -> toExpenseResponse(expense, categoryNameMap.getOrDefault(expense.getCategoryId(), "Unknown")))
            .toList();
            
    return PageResponse.<ExpenseResponse>builder()
            .page(resultPage.getNumber())
            .size(resultPage.getSize())
            .total(resultPage.getTotalElements())
            .items(items)
            .build();
}
```

### C. Tầng Controller (`ExpenseController.java`)
Chúng tôi đã tiến hành nạp chồng API `GET /expenses` hiện có để nhận thêm hai tham số `@RequestParam` tùy chọn là `page` và `size`:
- Nếu `page` và `size` được truyền lên (không null), controller sẽ định tuyến sang logic phân trang `expenseService.getExpensesPage(...)` và trả về kiểu `PageResponse`.
- Nếu `page` và `size` bị thiếu (null), controller trả về `List<ExpenseResponse>` như cũ.
- Việc này giúp **bảo vệ tính tương thích ngược 100%** đối với các phân hệ khác (như trang Admin Finance, Dashboard hay AI Copilot) mà không cần viết lại endpoint, đồng thời sử dụng chung phân quyền API có sẵn trong `authentication-service` một cách cực kỳ an toàn.

---

## 3. Chi tiết Triển khai ở Frontend (Angular)

### A. Dịch vụ API (`super-app-command.service.ts`)
- Định nghĩa interface generic `PageResponse<T>` để nhận cấu trúc phân trang từ backend:
  ```typescript
  export interface PageResponse<T> {
    page: number;
    size: number;
    total: number;
    items: T[];
  }
  ```
- Viết phương thức `getExpensesPage` gửi yêu cầu HTTP GET kèm theo các query params `page` và `size`.

### B. Logic Component (`expenses.component.ts`)
- Khai báo các biến trạng thái phân trang:
  ```typescript
  isExpensesListModalVisible = false;
  expensePageIndex = 1;
  expensePageSize = 10;
  expenseTotalCount = 0;
  ```
- Viết hàm `loadExpensesPage()` để tải bất đồng bộ (Lazy-load) trang chi tiêu hiện tại khi người dùng chuyển trang hoặc thay đổi bộ lọc.
- Thiết lập reset `expensePageIndex = 1` mỗi khi người dùng thay đổi bộ lọc danh mục hoặc bộ lọc tháng để tránh lỗi lệch trang.

### C. Giao diện Người dùng (`expenses.component.html` & `.css`)
- **Banner Quản lý Kho Hóa đơn**: Thiết kế Premium với phông nền gradient ngọc bích, pulsing badge hiển thị số lượng hóa đơn, thống kê chi tiêu hôm nay và nút bấm kích hoạt Dialog.
- **Dialog Kho Hóa đơn**: 
  - Sử dụng `<nz-modal>` thiết kế tối giản, hiện đại, tích hợp bộ lọc nhanh gọn gàng ở đầu.
  - Bảng danh sách chi tiêu và nút thao tác bảo mật tài liệu hóa đơn.
  - Tích hợp `<nz-pagination>` liên kết đồng bộ với `expensePageIndex` và sự kiện `onExpensePageChange($event)`.
