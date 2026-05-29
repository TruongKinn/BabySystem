# Tài liệu Dịch thuật i18n - Màn hình Journey (Hành trình của bé)

Tài liệu này hướng dẫn cách quản lý và cập nhật dịch thuật (i18n) cho màn hình **Journey (Hành trình của bé / Memory DNA)** tại đường dẫn `/app/journey` trong ứng dụng BabySystem.

---

## 1. Cấu trúc thư mục dịch thuật

Theo chuẩn phát triển **i18n-generator (chia nhỏ theo route)** của dự án, các file dịch thuật của màn hình Journey được quản lý riêng biệt để tránh xung đột mã nguồn:

*   **File dịch tiếng Việt**: [vi.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/app/journey/vi.json)
*   **File dịch tiếng Anh**: [en.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/app/journey/en.json)
*   **File dịch tiếng Nhật**: [ja.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/app/journey/ja.json)
*   **File dịch tiếng Trung**: [zh.json](file:///d:/AI-AGENT/BabySystem/codebase/frontend/public/i18n/app/journey/zh.json)

---

## 2. Quy trình Cập nhật & Biên dịch

Khi bạn muốn thay đổi bất kỳ nhãn hiển thị, thông báo lỗi hoặc gợi ý AI trên màn hình Journey, hãy thực hiện theo 2 bước sau:

### Bước 1: Chỉnh sửa các file JSON con
Mở các file dịch tương ứng ở mục 1 và cập nhật nội dung. 
*Ví dụ: Để sửa tiêu đề nút "Thêm cột mốc" thành "Thêm ký ức", cập nhật key `"addMilestone"` trong file `vi.json`:*
```json
"toolbar": {
  "addMilestone": "Thêm ký ức"
}
```

### Bước 2: Chạy script đồng bộ (Biên dịch)
Sau khi thay đổi bất kỳ file JSON con nào, bạn **phải** chạy lệnh biên dịch từ thư mục root của dự án để deep-merge bản dịch vào các file ngôn ngữ tổng của hệ thống:

```bash
node codebase/scripts/compile-i18n.js
```

Script sẽ tự động:
1. Quét qua toàn bộ các thư mục con trong `public/i18n/`.
2. Tạo file backup phòng ngừa rủi ro (ví dụ: `vi.json.bak`, `en.json.bak`).
3. Deep-merge dữ liệu từ các file con (ở route `app.journey`) vào các file cha `vi.json` và `en.json` ở root.

---

## 3. Cách sử dụng trong Mã nguồn

### Trong file HTML (`journey.component.html`)
Sử dụng Angular pipe `translate` cho các văn bản hiển thị tĩnh:
*   Văn bản tĩnh:
    ```html
    <h1>{{ 'app.journey.hero.title' | translate }}</h1>
    ```
*   Thuộc tính (Attributes):
    ```html
    <nz-select [nzPlaceHolder]="'app.journey.toolbar.babySelectPlaceholder' | translate"></nz-select>
    ```

### Trong file TypeScript (`journey.component.ts`)
Sử dụng `I18nService` đã được tiêm vào component thông qua DI:
*   Dịch chuỗi tĩnh:
    ```typescript
    this.notification.success('Journey+', this.i18n.translate('app.journey.notifications.saveSuccess'));
    ```
*   Dịch chuỗi động có tham số (Interpolation):
    ```typescript
    this.i18n.translate('app.journey.systemEvents.care.story', {
      feedings: summary.feedings,
      diaperChanges: summary.diaperChanges,
      sleepHours: this.formatDecimal(summary.sleepHours)
    });
    ```

### Cơ chế Cập nhật Ngôn ngữ Động (Hot Reload)
Màn hình Journey chứa nhiều dữ liệu động được sinh ra và gán tĩnh từ TS (`timelineEvents`, `suggestions`, `dnaLayers`,...). Để tránh tình trạng **lẫn lộn ngôn ngữ** khi người dùng chuyển đổi ngôn ngữ trên Header (mà không F5 trang), component đã được thiết kế lắng nghe sự kiện thay đổi ngôn ngữ thông qua `this.i18n.currentLanguage$`:

```typescript
this.i18n.currentLanguage$
  .pipe(takeUntil(this.destroy$))
  .subscribe(() => {
    if (this.selectedBabyId) {
      this.rebuildJourneyState(); // Tự động tạo lại toàn bộ dữ liệu theo ngôn ngữ mới ngay lập tức
    }
  });
```
*Lưu ý: Luôn implement `OnDestroy` và dọn dẹp subscription bằng `takeUntil(this.destroy$)` để tránh rò rỉ bộ nhớ.*

---

## 4. Lưu ý Kỹ thuật về sử dụng Icons (Ant Design / Ng-Zorro)

Khi sử dụng các icon động trong các cấu trúc dữ liệu (`suggestion.icon`, `event.icon`, `dnaLayer.icon`,...):
*   **TRÁNH** gán cứng thuộc tính `nzTheme="fill"` trên các component/thẻ icon động như:
    ```html
    <span nz-icon [nzType]="suggestion.icon" nzTheme="fill"></span>
    ```
*   **Lý do**: Không phải tất cả các icon trong bộ thư viện Ant Design đều hỗ trợ theme `fill` (ví dụ: `line-chart`, `team`,... chỉ có theme `outline` mặc định). Việc ép dùng `nzTheme="fill"` với các icon không tồn tại phiên bản fill sẽ khiến hệ thống cố gắng tải file SVG không tồn tại từ server (`assets/fill/line-chart.svg` hoặc `team.svg`) dẫn đến lỗi **Network 404** và làm crash Angular Change Detection.
*   **Giải pháp**: Bỏ `nzTheme="fill"` để Ant Design tự động nhận diện và sử dụng theme outline mặc định đối với các icon động. Chỉ sử dụng `nzTheme="fill"` cho các icon tĩnh mà bạn chắc chắn có hỗ trợ fill (ví dụ: `star`, `heart`, `lock`, `bulb`, `book`).

