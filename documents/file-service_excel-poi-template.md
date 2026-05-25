# Tài liệu Hướng dẫn: Sinh tệp Excel mẫu chuyên nghiệp bằng Apache POI (file-service)

Tài liệu này hướng dẫn chi tiết cách sử dụng thư viện **Apache POI** trong `file-service` để sinh động tệp Excel mẫu nhập liệu chi tiêu, đảm bảo tính thẩm mỹ cao (Premium UI/UX) và đồng bộ với ngôn ngữ thiết kế của dự án.

---

## 1. Kiến trúc Giải pháp

Thay vì lưu trữ một tệp Excel tĩnh ở phía frontend (không thể định dạng kiểu dáng đẹp nếu dùng phiên bản SheetJS miễn phí), hệ thống sử dụng **Apache POI** tại backend `file-service` để sinh động tệp Excel dạng nhị phân thông qua REST API.

```
[Frontend (Documents Hub)]
        │
        ▼ (Bấm tải Excel mẫu)
[Gọi GET URL: http://localhost:4953/file/files/template/excel]
        │
        ▼ (Định tuyến qua Gateway cổng 4953)
[API Gateway: Rewrite /file/files/... thành /api/files/...]
        │
        ▼ (Chuyển tiếp đến file-service cổng 8092)
[FileImportController]
        │
        ▼ (Thực thi POI Engine)
[DocumentParseService.generateExcelTemplate()]
        │
        ▼ (Trả về byte[])
[Phản hồi HTTP 200 với headers: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet]
```

---

## 2. Thiết kế giao diện Excel (Premium Styling)

Giao diện của file Excel được thiết kế dựa trên quy chuẩn **Warm Palette** (tông cam thương hiệu của User Portal):

*   **Font chữ toàn cục:** `Times New Roman` (mang lại cảm giác cổ điển, thanh lịch và trang trọng).
*   **Header Row (Dòng tiêu đề):**
    *   Màu nền: Cam thương hiệu `#F97316` (RGB: `249, 115, 22`).
    *   Màu chữ: Trắng (`WHITE`), in đậm, kích thước 11pt.
    *   Chiều cao dòng: 28pt (giúp khoảng cách thoáng đãng, dễ đọc).
    *   Căn lề: Căn giữa theo cả chiều dọc và ngang.
*   **Data Rows (Dòng dữ liệu mẫu):**
    *   Font chữ: `Times New Roman`, 11pt, màu đen tiêu chuẩn.
    *   Chiều cao dòng: 22pt.
    *   Đường viền: Viền mỏng (`THIN`) màu xám nhạt bao quanh tất cả các ô.
*   **Định dạng các cột cụ thể:**
    *   **Ngày chi tiêu:** Căn giữa cột (`CENTER`), định dạng văn bản chuẩn `YYYY-MM-DD`.
    *   **Danh mục & Ghi chú:** Căn trái mặc định (`LEFT`).
    *   **Số tiền:** Căn phải (`RIGHT`), định dạng hiển thị số có phân tách hàng nghìn (`#,##0`).
*   **Độ rộng cột:** Tự động co giãn (`sheet.autoSizeColumn`) và cộng thêm khoảng đệm lề (padding) 1,200 đơn vị để chữ không bao giờ bị cắt cụt.

---

## 3. Triển khai Mã nguồn Java (Apache POI)

### Phương thức trong `DocumentParseService.java`:
```java
public byte[] generateExcelTemplate() {
    try (Workbook workbook = new XSSFWorkbook()) {
        Sheet sheet = workbook.createSheet("Chi tiêu mẫu");
        sheet.setDisplayGridlines(true);

        // Định nghĩa Font & Style Header
        Font headerFont = workbook.createFont();
        headerFont.setFontName("Times New Roman");
        headerFont.setFontHeightInPoints((short) 11);
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());

        byte[] orangeRGB = new byte[]{(byte) 249, (byte) 115, (byte) 22};
        XSSFColor headerBgColor = new XSSFColor(orangeRGB, new DefaultIndexedColorMap());

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        ((org.apache.poi.xssf.usermodel.XSSFCellStyle) headerStyle).setFillForegroundColor(headerBgColor);
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderBottom(BorderStyle.MEDIUM);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        // Định nghĩa Font & Style Dữ liệu
        Font dataFont = workbook.createFont();
        dataFont.setFontName("Times New Roman");
        dataFont.setFontHeightInPoints((short) 11);

        CellStyle dataStyle = workbook.createCellStyle();
        dataStyle.setFont(dataFont);
        dataStyle.setBorderTop(BorderStyle.THIN);
        dataStyle.setBorderBottom(BorderStyle.THIN);
        dataStyle.setBorderLeft(BorderStyle.THIN);
        dataStyle.setBorderRight(BorderStyle.THIN);
        dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

        // Style Ngày chi tiêu
        CellStyle dateStyle = workbook.createCellStyle();
        dateStyle.cloneStyleFrom(dataStyle);
        dateStyle.setAlignment(HorizontalAlignment.CENTER);

        // Style Số tiền
        CellStyle amountStyle = workbook.createCellStyle();
        amountStyle.cloneStyleFrom(dataStyle);
        amountStyle.setAlignment(HorizontalAlignment.RIGHT);
        DataFormat format = workbook.createDataFormat();
        amountStyle.setDataFormat(format.getFormat("#,##0"));

        // Điền Header & Dữ liệu mẫu (3 hàng chi tiêu mẫu)
        // ... (Xem mã nguồn chi tiết trong codebase) ...
        
        // Tự động co giãn cột
        for (int i = 0; i < 4; i++) {
            sheet.autoSizeColumn(i);
            sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1200);
        }

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        workbook.write(bos);
        return bos.toByteArray();
    } catch (Exception e) {
        throw new IllegalStateException("Failed to generate Excel template", e);
    }
}
```

---

## 4. Cấu hình Gateway và Frontend
API Gateway của dự án lắng nghe tại cổng `4953` (`http://localhost:4953`). 

Cấu hình định tuyến trong `api-gateway` (`application.yml`):
```yaml
        - id: file-service
          uri: ${FILE_SERVICE_URI:http://localhost:8092}
          predicates:
            - Path=/file/**
          filters:
            - RewritePath=/file/(?<segment>.*), /api/$\{segment}
```

Khi người dùng bấm vào nút tải Excel mẫu, frontend sẽ gọi trực tiếp thông qua đường dẫn động được cấu hình bằng `API_CONFIG.GATEWAY_URL`:
`${API_CONFIG.GATEWAY_URL}/file/files/template/excel` (tương đương `http://localhost:4953/file/files/template/excel`).

Tệp tải về sẽ mang tên `expense_import_template.xlsx` với giao diện Premium và bắt mắt hoàn toàn hoạt động.
