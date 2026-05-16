# MOM SUPER APP - USER/ADMIN PORTAL SPLIT

## 1. Mục tiêu

Tách hệ thống frontend thành 2 cổng độc lập:

- `User Portal`: dành cho thành viên gia đình đăng nhập và sử dụng tính năng chăm sóc gia đình.
- `Admin Portal`: dành cho admin quản lý tài khoản người dùng.

## 2. URL chuẩn

- User login: `/app/login`
- User app: `/app/*`
- Admin login: `/admin/login`
- Admin app: `/admin/*`
- Root hiện tại (`/`) redirect về Admin login.

## 3. Điều hướng sau đăng nhập

- Role `ADMIN/OWNER` -> `/admin/users`
- Role còn lại (`USER`) -> `/app/dashboard`

## 4. Role guard

- Các route `admin` yêu cầu `ADMIN` hoặc `OWNER`.
- User chưa đăng nhập vào route admin sẽ bị chuyển về `/admin/login`.
- User chưa đăng nhập vào route app sẽ bị chuyển về `/app/login`.

## 5. Admin Portal MVP

Trang `Admin User Management` (`/admin/users`) hỗ trợ:

- xem danh sách user
- khóa tài khoản
- mở khóa tài khoản
- reset mật khẩu tạm (force đổi mật khẩu lần đăng nhập kế tiếp)

API đang dùng:

- `GET /auth/account/user/list`
- `PATCH /auth/users/{id}/status`
- `POST /auth/users/{id}/reset-password`

## 6. User Portal MVP

User Portal tiếp tục dùng các module nghiệp vụ hiện có:

- dashboard
- baby
- meals
- expenses
- tasks
- shopping
- insights
- family
- profile
- settings

## 7. Gợi ý mở rộng tiếp theo

- Tách build artifact thành 2 frontend package riêng (`mom-user-web`, `mom-admin-web`) nếu cần scale deployment độc lập.
- Bổ sung audit log hiển thị trực tiếp trên Admin Portal.
- Bổ sung quản trị family mapping theo từng user ở Admin Portal.
