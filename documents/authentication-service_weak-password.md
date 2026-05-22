# Tính năng Cảnh báo Mật khẩu Yếu (Weak Password Warning)

## Tổng quan
Tính năng yêu cầu người dùng đặt mật khẩu an toàn theo tiêu chuẩn bảo mật. Áp dụng cho các API liên quan đến việc tạo hoặc thay đổi mật khẩu trong `authentication-service`.

## Chi tiết triển khai Backend (authentication-service)
1. **Custom Validator (`@StrongPassword`)**:
   - Được tạo trong `vn.agent.validation.StrongPassword` và `vn.agent.validation.StrongPasswordValidator`.
   - Sử dụng Regex để kiểm tra mật khẩu: `^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#&()–[{}]:;',?/*~$^+=<>]).{8,20}$`.
   - Mật khẩu phải dài từ 8-20 ký tự, chứa ít nhất 1 chữ số, 1 chữ hoa, 1 chữ thường và 1 ký tự đặc biệt.
2. **DTOs cập nhật**:
   - `CreateUserRequest.java`
   - `ChangePasswordRequest.java`
   - `ForceChangePasswordRequest.java`

## Chi tiết triển khai Frontend
1. **PasswordStrengthComponent**:
   - Một UI component hiển thị thanh sức mạnh mật khẩu (Yếu/Trung bình/Mạnh) bằng các màu sắc cảnh báo.
   - Hiển thị danh sách các điều kiện của một mật khẩu mạnh và đánh dấu tích xanh khi người dùng nhập thỏa mãn.
   - Đường dẫn: `frontend\src\app\shared\components\password-strength\password-strength.component.*`.
2. **Tích hợp vào Login (Force Change Password)**:
   - Được thêm vào `login.component.html` (Form đổi mật khẩu tạm).
   - Thêm Regex Validator vào `forceChangeForm` trong `login.component.ts`.

## Tương lai
Nếu hệ thống mở rộng và có giao diện đổi mật khẩu ở Profile hoặc tạo tài khoản trực tiếp có nhập password, có thể sử dụng lại `PasswordStrengthComponent` này bằng cách thêm vào HTML:
```html
<app-password-strength [password]="form.get('password')?.value"></app-password-strength>
```
