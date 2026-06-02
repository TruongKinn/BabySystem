# Tài liệu Nâng cấp Giao diện Nút bấm trên Trang cá nhân (Profile Component)

## Bối cảnh và Vấn đề
Trên màn hình **Profile (Thông tin cá nhân)** của người dùng, ba nút bấm hành động bao gồm:
1. **Chỉnh sửa Profile** (Edit Profile) - Cạnh nút "Xuất PDF".
2. **Thay đổi** (Change Password) - Trong danh mục Bảo mật (Mật khẩu).
3. **Thiết lập / Tắt 2FA** (2FA Setup) - Trong danh mục Bảo mật (Xác thực 2 bước).

Trước đó, các nút này được thiết lập bằng class `.btn-user-outline` (nền trong suốt, viền mỏng và chữ có màu), dẫn đến việc hiển thị nhạt nhòa, thiếu màu sắc, không có chiều sâu và không ăn khớp với phong cách lộng lẫy của các nút chính (như nút "Xuất PDF" sử dụng class `.btn-user-primary`).

Để tối ưu hóa trải nghiệm trực quan theo yêu cầu của người dùng ("làm nó đẹp mắt như dạng xuất pdf ấy có cả icon cho tôi"), chúng tôi đã nâng cấp cả 3 nút bấm này lên chuẩn giao diện cao cấp nhất: **Primary Gradient** đồng bộ cùng các icon trực quan.

## Giải pháp thực hiện
Chúng tôi đã thực hiện nâng cấp toàn diện cho ba nút bấm này sang class **`.btn-user-primary`** và gán thuộc tính `nzType="primary"`:
- **Cơ chế hoạt động**: Sử dụng dải màu gradient cực kỳ lộng lẫy của màu chủ đạo hệ thống (`var(--user-grad-1)`), tự động đổi màu theo theme được người dùng tùy chọn (Xanh dương, Cam, Hồng, Xanh lá...).
- **Độ nổi bật cao**: Sở hữu bóng đổ sâu 3 lớp (`box-shadow: 0 4px 14px color-mix(...)`), giúp các nút bấm nổi bật, giàu chiều sâu và vô cùng cao cấp.
- **Micro-interactions sinh động**: Khi rê chuột (hover), nút bấm sẽ tự động nhô nhẹ lên (`translateY(-1px)`) và bóng đổ sẽ lan tỏa rộng hơn đem lại cảm giác tương tác tuyệt vời.
- **Bổ sung Icon trực quan**: Mỗi nút được trang bị thêm một icon dạng viền mỏng (outline) cực kỳ tinh tế, giúp người dùng dễ dàng nhận diện chức năng ngay lập tức.

## Chi tiết các thay đổi
Tệp sửa đổi: `codebase/frontend/src/app/profile/profile.component.html`

### 1. Nút "Chỉnh sửa Profile"
- **Trước**:
  ```html
  <button nz-button nzType="default" class="btn-user-outline" nzSize="default" (click)="openEditProfile(profile)">
    <span nz-icon nzType="edit" nzTheme="outline"></span>
    {{ 'app.profile.actions.editProfile' | translate }}
  </button>
  ```
- **Sau**:
  ```html
  <button nz-button nzType="primary" class="btn-user-primary" nzSize="default" (click)="openEditProfile(profile)">
    <span nz-icon nzType="edit" nzTheme="outline"></span>
    {{ 'app.profile.actions.editProfile' | translate }}
  </button>
  ```

### 2. Nút "Thay đổi" (Mật khẩu)
- **Trước**:
  ```html
  <button nz-button nzType="default" nzSize="small" class="btn-user-outline" (click)="openChangePassword()">
    {{ 'app.profile.cards.security.password.changeBtn' | translate }}
  </button>
  ```
- **Sau** (Thêm icon `key` và đổi sang primary gradient):
  ```html
  <button nz-button nzType="primary" nzSize="small" class="btn-user-primary" (click)="openChangePassword()">
    <span nz-icon nzType="key" nzTheme="outline"></span>
    {{ 'app.profile.cards.security.password.changeBtn' | translate }}
  </button>
  ```

### 3. Nút "Thiết lập / Tắt" (Xác thực 2 bước)
- **Trước**:
  ```html
  <button nz-button nzType="default" nzSize="small" class="btn-user-outline" (click)="open2faSetup()">
    {{ (is2faEnabled ? 'app.profile.2fa.status.turnOff' : 'app.profile.2fa.status.setup') | translate }}
  </button>
  ```
- **Sau** (Thêm icon `safety` và đổi sang primary gradient):
  ```html
  <button nz-button nzType="primary" nzSize="small" class="btn-user-primary" (click)="open2faSetup()">
    <span nz-icon nzType="safety" nzTheme="outline"></span>
    {{ (is2faEnabled ? 'app.profile.2fa.status.turnOff' : 'app.profile.2fa.status.setup') | translate }}
  </button>
  ```

## Kết quả đạt được
Ba nút bấm hành động quan trọng trên trang cá nhân giờ đây đều sở hữu vẻ đẹp rực rỡ, lộng lẫy và cao cấp chuẩn Fintech như nút "Xuất PDF". Sự bổ sung của các icon (`edit`, `key`, `safety`) kết hợp cùng hiệu ứng gradient chuyển màu mượt mà giúp giao diện trở nên sống động, sang trọng và đem lại trải nghiệm sử dụng hoàn hảo cho người dùng.
