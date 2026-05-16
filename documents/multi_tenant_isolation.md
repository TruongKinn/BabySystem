# Hệ thống Phân quyền và Cách ly Dữ liệu Đa hộ gia đình (Multi-Tenant Data Isolation)

Tài liệu này mô tả kiến trúc và cách triển khai cách ly dữ liệu giữa các hộ gia đình (family) trong hệ thống BabySystem.

## 1. Tổng quan kiến trúc

Để đảm bảo gia đình này không thể xem hoặc sửa dữ liệu của gia đình khác (chống lỗi IDOR), hệ thống sử dụng cơ chế xác thực tập trung tại API Gateway và truyền ngữ cảnh bảo mật xuống các microservices.

### Luồng xử lý:
1. **API Gateway (api-gateway)**: 
   - Giải mã JWT để lấy `userId`.
   - Gọi `account-service` để lấy danh sách `familyIds` mà người dùng thuộc về.
   - Inject headers `X-User-Id` và `X-Family-Ids` vào request trước khi gửi xuống service hạ nguồn.
2. **Common Library (common-lib)**:
   - Cung cấp `UserContextInterceptor` tự động đăng ký vào Spring MVC của tất cả microservices.
   - Interceptor này đọc headers và lưu vào `ThreadLocal` thông qua lớp `UserContext`.
3. **Microservices (hạ nguồn)**:
   - Sử dụng `DataIsolationUtil.validateFamilyAccess(familyId)` để kiểm tra quyền truy cập trước khi thực hiện thao tác dữ liệu.

## 2. Các thành phần chính

### Backend

#### common-lib
- `UserContext`: Lưu trữ `userId` và `familyIds` cho luồng xử lý hiện tại.
- `UserContextInterceptor`: Trích xuất thông tin từ header vào `UserContext`.
- `DataIsolationUtil`: Công cụ kiểm tra nhanh quyền truy cập family.

#### api-gateway
- `ApiPermissionFilter`: Phân quyền dựa trên Role và đồng thời nạp thông tin Family vào header.

#### account-service
- Cung cấp API quản lý thành viên và vai trò trong gia đình.
- API: `GET /api/users/{userId}/families` - Lấy danh sách gia đình của user.
- API: `PUT /api/families/{id}/members/{userId}/role` - Cập nhật vai trò thành viên (Admin gia đình thực hiện).

### Frontend

#### Family Management Screen
- Giao diện quản lý thành viên trong gia đình.
- Cho phép Admin gia đình:
  - Thêm thành viên mới.
  - Chỉnh sửa vai trò của thành viên hiện có (MOM, DAD, GRANDMA, CAREGIVER, ADMIN).

## 3. Cách sử dụng trong code mới

Khi viết một API mới cần bảo mật dữ liệu theo family, thực hiện như sau:

```java
@Service
public class MyService {
    public void processData(Long familyId) {
        // Kiểm tra xem user hiện tại có thuộc familyId này không
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        // Tiếp tục xử lý logic...
    }
}
```

## 4. Bảo mật Role-based

Ngoài cách ly theo Family, hệ thống vẫn duy trì phân quyền dựa trên Role (RBAC):
- **Admin Hệ thống**: Quản lý toàn bộ user và cấu hình global.
- **Admin Gia đình**: Quản lý thành viên và phân quyền trong nội bộ gia đình mình.
- **User/Member**: Chỉ thao tác dữ liệu trong gia đình mình theo vai trò được giao.
