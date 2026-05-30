---
description: Tự động kích hoạt và áp dụng skill i18n-generator khi phát hiện bất kỳ tác vụ nào liên quan đến i18n hoặc dịch thuật
globs: "**/*.{html,ts,json}"
trigger: always_on
---

# Tự động Kích hoạt Skill i18n-generator

## Khi nào áp dụng

Rule này áp dụng **tự động và bắt buộc** mỗi khi có yêu cầu hoặc tác vụ liên quan đến dịch thuật, đa ngôn ngữ, i18n, thêm ngôn ngữ mới, hoặc cập nhật văn bản hiển thị trên bất kỳ màn hình nào trong dự án.

## Hành vi bắt buộc

Khi gặp bất kỳ tác vụ nào liên quan đến i18n, dịch thuật hoặc đa ngôn ngữ, AI PHẢI:

1. **Tự động nạp và áp dụng** toàn bộ các chỉ dẫn của skill `i18n-generator` tại `.agent/skills/i18n-generator/SKILL.md` mà không cần đợi người dùng phải yêu cầu kích hoạt skill một cách tường minh.
2. **Trích xuất Route từ màn hình**: Tự động phân tích URL route của màn hình để thiết lập thư mục dịch tương ứng (ví dụ: `http://localhost:4200/app/settings` ➡️ `public/i18n/app/settings/`).
3. **Phát triển theo cơ chế Chia nhỏ & Đầy đủ 4 ngôn ngữ**: 
   - KHÔNG thêm trực tiếp các key dịch thuật đặc thù của màn hình vào các file dịch gốc ở thư mục root.
   - BẮT BUỘC khi thêm mới hoặc cập nhật i18n cho bất kỳ màn hình/route nào, PHẢI tạo đầy đủ đồng thời cả 4 file dịch ngôn ngữ con: Tiếng Việt (`vi.json`), Tiếng Anh (`en.json`), Tiếng Trung (`zh.json`), và Tiếng Nhật (`ja.json`) trong thư mục route tương ứng. TUYỆT ĐỐI không được thiếu bất kỳ ngôn ngữ nào trong 4 ngôn ngữ này để đảm bảo tính đồng bộ trên toàn hệ thống.
4. **Thay thế code cứng**: Tự động rà quét và thay thế các chuỗi văn bản cứng trong file component HTML (sử dụng pipe `| translate`) và TS (sử dụng `I18nService.translate()`).
5. **Bắt buộc chạy Script Đồng bộ**: Sau khi thực hiện xong việc cập nhật file JSON con hoặc chỉnh sửa code dịch thuật, AI PHẢI tự động chạy lệnh compile để đồng bộ dữ liệu:
   ```bash
   node codebase/scripts/compile-i18n.js
   ```
