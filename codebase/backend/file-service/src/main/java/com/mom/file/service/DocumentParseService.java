package com.mom.file.service;

import com.mom.file.controller.dto.ExcelParseResponse;
import com.mom.file.controller.dto.DocumentParseResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import java.io.ByteArrayOutputStream;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.*;

@Slf4j
@Service
public class DocumentParseService {

    private static final int MAX_TEXT_PREVIEW_LENGTH = 1500;

    public ExcelParseResponse parseExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }

        List<String> headers = new ArrayList<>();
        List<ExcelParseResponse.RowData> rows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new IllegalArgumentException("Excel sheet not found");
            }

            int rowCount = sheet.getPhysicalNumberOfRows();
            if (rowCount == 0) {
                return new ExcelParseResponse(headers, rows, 0);
            }

            // Find header row (usually the first row with cells)
            Iterator<Row> rowIterator = sheet.rowIterator();
            Row headerRow = null;
            while (rowIterator.hasNext()) {
                Row r = rowIterator.next();
                if (r != null && r.getPhysicalNumberOfCells() > 0) {
                    headerRow = r;
                    break;
                }
            }

            if (headerRow == null) {
                return new ExcelParseResponse(headers, rows, 0);
            }

            // Read headers
            int maxCellNum = headerRow.getLastCellNum();
            for (int cn = 0; cn < maxCellNum; cn++) {
                Cell cell = headerRow.getCell(cn);
                if (cell != null) {
                    headers.add(getCellValueAsString(cell).trim());
                } else {
                    headers.add("Col_" + cn);
                }
            }

            // Read data rows
            int rowIdx = 1;
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
            dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

            while (rowIterator.hasNext()) {
                Row r = rowIterator.next();
                if (r == null || r.getRowNum() == headerRow.getRowNum()) {
                    continue;
                }

                Map<String, Object> dataMap = new LinkedHashMap<>();
                boolean hasData = false;

                for (int cn = 0; cn < maxCellNum; cn++) {
                    Cell cell = r.getCell(cn);
                    String headerName = headers.get(cn);

                    if (cell != null) {
                        Object val = getCellValue(cell, dateFormat);
                        if (val != null && !val.toString().trim().isEmpty()) {
                            dataMap.put(headerName, val);
                            hasData = true;
                        } else {
                            dataMap.put(headerName, "");
                        }
                    } else {
                        dataMap.put(headerName, "");
                    }
                }

                if (hasData) {
                    rows.add(new ExcelParseResponse.RowData(r.getRowNum() + 1, dataMap));
                }
            }

        } catch (Exception e) {
            log.error("Error parsing Excel file", e);
            throw new IllegalStateException("Failed to parse Excel: " + e.getMessage(), e);
        }

        return new ExcelParseResponse(headers, rows, rows.size());
    }

    public DocumentParseResponse parseDocx(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }

        try (InputStream is = file.getInputStream();
             XWPFDocument document = new XWPFDocument(is);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {

            String text = extractor.getText();
            int wordCount = text == null ? 0 : text.split("\\s+").length;
            int pageEstimate = Math.max(1, wordCount / 400); // Standard word-per-page estimation
            String textPreview = "";

            if (text != null) {
                textPreview = text.substring(0, Math.min(text.length(), MAX_TEXT_PREVIEW_LENGTH)).trim();
            }

            String author = document.getProperties().getCoreProperties().getCreator();
            if (author == null) author = "Unknown";

            return new DocumentParseResponse(
                    file.getOriginalFilename(),
                    pageEstimate,
                    file.getSize() / 1024,
                    textPreview,
                    author
            );

        } catch (Exception e) {
            log.error("Error parsing Word DOCX file", e);
            throw new IllegalStateException("Failed to parse Word Document: " + e.getMessage(), e);
        }
    }

    public DocumentParseResponse parsePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }

        try {
            byte[] fileBytes = file.getBytes();
            try (PDDocument document = Loader.loadPDF(fileBytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setEndPage(Math.min(5, document.getNumberOfPages())); // Only strip first few pages for preview
                String text = stripper.getText(document);
                
                String textPreview = "";
                if (text != null) {
                    textPreview = text.substring(0, Math.min(text.length(), MAX_TEXT_PREVIEW_LENGTH)).trim();
                }

                String author = document.getDocumentInformation().getAuthor();
                if (author == null) author = "Unknown";

                return new DocumentParseResponse(
                        file.getOriginalFilename(),
                        document.getNumberOfPages(),
                        file.getSize() / 1024,
                        textPreview,
                        author
                );
            }
        } catch (Exception e) {
            log.error("Error parsing PDF file", e);
            throw new IllegalStateException("Failed to parse PDF: " + e.getMessage(), e);
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        switch (type) {
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                return String.valueOf(cell.getNumericCellValue());
            case STRING:
                return cell.getStringCellValue();
            default:
                return "";
        }
    }

    private Object getCellValue(Cell cell, SimpleDateFormat dateFormat) {
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        switch (type) {
            case BOOLEAN:
                return cell.getBooleanCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    Date date = cell.getDateCellValue();
                    return dateFormat.format(date);
                }
                double numVal = cell.getNumericCellValue();
                if (numVal == (long) numVal) {
                    return (long) numVal;
                }
                return numVal;
            case STRING:
                return cell.getStringCellValue().trim();
            default:
                return null;
        }
    }

    public byte[] generateExcelTemplate(String type) {
        if (type == null) {
            type = "expense";
        }
        type = type.toLowerCase().trim();

        try (Workbook workbook = new XSSFWorkbook()) {
            String sheetName;
            String[] columns;
            Object[][] data;
            byte[] rgbColor;

            switch (type) {
                case "baby":
                    sheetName = "Dinh dưỡng & Sức khỏe bé";
                    columns = new String[]{"Ngày giờ", "Loại bữa ăn", "Lượng ăn (ml/g)", "Chiều cao (cm)", "Cân nặng (kg)", "Ghi chú y tế"};
                    data = new Object[][]{
                        {"2026-05-20 07:30", "Sữa công thức", 180.0, 68.5, 7.8, "Bé bú tốt, ngủ sâu"},
                        {"2026-05-20 11:30", "Ăn dặm (Bột rây)", 100.0, 68.5, 7.8, "Bé ăn hết suất"},
                        {"2026-05-21 19:00", "Sữa mẹ", 150.0, 68.7, 7.9, "Bé hơi quấy trước khi ăn"}
                    };
                    // Màu xanh Teal nhã nhặn #0F766E (RGB: 15, 118, 110)
                    rgbColor = new byte[]{(byte) 15, (byte) 118, (byte) 110};
                    break;

                case "shopping":
                    sheetName = "Kế hoạch Mua sắm";
                    columns = new String[]{"Tên món đồ", "Danh mục mua sắm", "Đơn giá dự kiến", "Số lượng", "Mức độ ưu tiên", "Ghi chú"};
                    data = new Object[][]{
                        {"Tã quần Moony size L", "Bỉm tã", 380000.0, 2.0, "Cao", "Mua loại nội địa Nhật"},
                        {"Sữa bột Meiji số 0-1", "Sữa công thức", 520000.0, 1.0, "Cao", "Check hạn sử dụng xa"},
                        {"Đồ chơi gỗ thả hình", "Đồ chơi", 150000.0, 1.0, "Trung bình", "Kích thích tư duy cho bé"}
                    };
                    // Màu xanh Indigo sang trọng #4338CA (RGB: 67, 56, 202)
                    rgbColor = new byte[]{(byte) 67, (byte) 56, (byte) 202};
                    break;

                case "vaccine":
                    sheetName = "Lịch Tiêm chủng & Y tế";
                    columns = new String[]{"Ngày tiêm", "Tên vắc xin", "Mũi số", "Chi phí tiêm", "Cơ sở tiêm chủng", "Ngày hẹn tiếp theo"};
                    data = new Object[][]{
                        {"2026-05-15", "6 trong 1 (Infanrix)", 2.0, 1050000.0, "Trung tâm VNVC", "2026-06-15"},
                        {"2026-05-20", "Phế cầu (Synflorix)", 1.0, 980000.0, "Phòng tiêm chủng phường", "2026-07-20"},
                        {"2026-05-25", "Nhỏ ngừa Rota", 2.0, 850000.0, "Bệnh viện Sản Nhi", "2026-06-25"}
                    };
                    // Màu xanh Slate quý phái #475569 (RGB: 71, 85, 105)
                    rgbColor = new byte[]{(byte) 71, (byte) 85, (byte) 105};
                    break;

                case "expense":
                default:
                    sheetName = "Chi tiêu gia đình";
                    columns = new String[]{"Ngày chi tiêu", "Danh mục", "Số tiền", "Ghi chú"};
                    data = new Object[][]{
                        {"2026-05-20", "Meals", 150000.0, "Ăn trưa gia đình"},
                        {"2026-05-21", "Shopping", 550000.0, "Mua tã bỉm cho bé"},
                        {"2026-05-22", "Education", 1200000.0, "Học phí lớp vẽ của bé"}
                    };
                    // Màu xanh Navy thanh lịch #1E293B (RGB: 30, 41, 59)
                    rgbColor = new byte[]{(byte) 30, (byte) 41, (byte) 59};
                    break;
            }

            Sheet sheet = workbook.createSheet(sheetName);
            sheet.setDisplayGridlines(true);

            // [NÂNG CẤP CLAUDE 1] Khóa cố định hàng đầu tiên (Freeze Pane) để cuộn dữ liệu mượt mà
            sheet.createFreezePane(0, 1);

            // 1. Định nghĩa Font Header (Times New Roman theo yêu cầu)
            Font headerFont = workbook.createFont();
            headerFont.setFontName("Times New Roman");
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFColor headerBgColor = new XSSFColor(rgbColor, new DefaultIndexedColorMap());

            // 2. Cấu hình style Header với viền tinh tế
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            ((org.apache.poi.xssf.usermodel.XSSFCellStyle) headerStyle).setFillForegroundColor(headerBgColor);
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            
            // Đường viền Header xám đậm trung bình
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
            headerStyle.setBorderBottom(BorderStyle.MEDIUM);
            headerStyle.setBottomBorderColor(IndexedColors.GREY_50_PERCENT.getIndex());
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());

            // 3. Định nghĩa Font dữ liệu (Times New Roman theo yêu cầu)
            Font dataFont = workbook.createFont();
            dataFont.setFontName("Times New Roman");
            dataFont.setFontHeightInPoints((short) 11);

            // 4. Style Dữ liệu hàng lẻ (Nền trắng mặc định)
            CellStyle oddRowStyle = workbook.createCellStyle();
            oddRowStyle.setFont(dataFont);
            oddRowStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            
            oddRowStyle.setBorderTop(BorderStyle.THIN);
            oddRowStyle.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            oddRowStyle.setBorderBottom(BorderStyle.THIN);
            oddRowStyle.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            oddRowStyle.setBorderLeft(BorderStyle.THIN);
            oddRowStyle.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            oddRowStyle.setBorderRight(BorderStyle.THIN);
            oddRowStyle.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());

            // [NÂNG CẤP CLAUDE 2] Style Dữ liệu hàng chẵn - Sọc xen kẽ (Zebra Striping) nền xám cực nhạt (#F9FAFB)
            byte[] zebraRGB = new byte[]{(byte) 249, (byte) 250, (byte) 251};
            XSSFColor zebraBgColor = new XSSFColor(zebraRGB, new DefaultIndexedColorMap());

            CellStyle evenRowStyle = workbook.createCellStyle();
            evenRowStyle.cloneStyleFrom(oddRowStyle);
            ((org.apache.poi.xssf.usermodel.XSSFCellStyle) evenRowStyle).setFillForegroundColor(zebraBgColor);
            evenRowStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // 5. Định nghĩa Style Căn giữa và Căn phải cho hàng lẻ/chẵn
            CellStyle oddCenterStyle = workbook.createCellStyle();
            oddCenterStyle.cloneStyleFrom(oddRowStyle);
            oddCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle evenCenterStyle = workbook.createCellStyle();
            evenCenterStyle.cloneStyleFrom(evenRowStyle);
            evenCenterStyle.setAlignment(HorizontalAlignment.CENTER);

            // Style Số tiền/Số lượng (định dạng hiển thị #,##0)
            DataFormat format = workbook.createDataFormat();
            
            CellStyle oddNumberStyle = workbook.createCellStyle();
            oddNumberStyle.cloneStyleFrom(oddRowStyle);
            oddNumberStyle.setAlignment(HorizontalAlignment.RIGHT);
            oddNumberStyle.setDataFormat(format.getFormat("#,##0"));

            CellStyle evenNumberStyle = workbook.createCellStyle();
            evenNumberStyle.cloneStyleFrom(evenRowStyle);
            evenNumberStyle.setAlignment(HorizontalAlignment.RIGHT);
            evenNumberStyle.setDataFormat(format.getFormat("#,##0"));

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(30); // Độ cao hàng header thoáng đãng

            // 6. Khởi tạo Comments / Hướng dẫn thông minh bằng Apache POI
            CreationHelper factory = workbook.getCreationHelper();
            Drawing<?> drawing = sheet.createDrawingPatriarch();

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);

                // Tạo nội dung chỉ dẫn chi tiết cho từng loại cột
                String colName = columns[i];
                String commentText = null;

                if (colName.contains("Ngày") || colName.contains("giờ")) {
                    commentText = "Hướng dẫn nhập Ngày/Giờ:\n- Mẫu Chi tiêu/Tiêm chủng/Mua sắm: YYYY-MM-DD (Ví dụ: 2026-05-20)\n- Mẫu Dinh dưỡng bé: YYYY-MM-DD HH:mm (Ví dụ: 2026-05-20 07:30)\n- Vui lòng nhập đúng để hệ thống phân tích tự động.";
                } else if (colName.contains("Số tiền") || colName.contains("Chi phí") || colName.contains("Đơn giá")) {
                    commentText = "Hướng dẫn nhập Số tiền/Chi phí:\n- Nhập số nguyên dương (Ví dụ: 150000 hoặc 520000)\n- Tuyệt đối KHÔNG nhập chữ 'đ', 'VND', dấu phẩy/chấm phân cách hàng nghìn.";
                } else if (colName.contains("Danh mục")) {
                    commentText = "Hướng dẫn nhập Danh mục:\n- Chi tiêu: Meals, Shopping, Education, Utilities, Medical, Travel...\n- Mua sắm: Bỉm tã, Sữa công thức, Đồ chơi, Quần áo, Thực phẩm...";
                } else if (colName.contains("Lượng ăn")) {
                    commentText = "Hướng dẫn nhập lượng ăn:\n- Chỉ nhập giá trị số ml hoặc gram (Ví dụ: 180 hoặc 100)\n- KHÔNG điền chữ 'ml' hoặc 'g' phía sau.";
                } else if (colName.contains("Chiều cao")) {
                    commentText = "Đơn vị đo Chiều cao:\n- Nhập số đo bằng cm (Ví dụ: 68.5 hoặc 72.0).";
                } else if (colName.contains("Cân nặng")) {
                    commentText = "Đơn vị đo Cân nặng:\n- Nhập số đo bằng kg (Ví dụ: 7.8 hoặc 8.5).";
                } else if (colName.contains("Ưu tiên") || colName.contains("Mức độ ưu tiên")) {
                    commentText = "Mức độ ưu tiên:\n- Vui lòng điền một trong ba giá trị: Cao, Trung bình, Thấp.";
                } else if (colName.contains("Mũi số") || colName.contains("Số lượng")) {
                    commentText = "Nhập số nguyên dương:\n- Ví dụ: 1, 2, 3...";
                }

                if (commentText != null) {
                    ClientAnchor anchor = factory.createClientAnchor();
                    anchor.setCol1(cell.getColumnIndex() + 1);
                    anchor.setCol2(cell.getColumnIndex() + 4);
                    anchor.setRow1(0);
                    anchor.setRow2(4);

                    Comment comment = drawing.createCellComment(anchor);
                    RichTextString rts = factory.createRichTextString(commentText);
                    comment.setString(rts);
                    comment.setAuthor("MOM App");
                    cell.setCellComment(comment);
                }
            }

            // 7. Điền dữ liệu mẫu và áp dụng style sọc xen kẽ, độ cao hàng rộng rãi
            for (int rowNum = 0; rowNum < data.length; rowNum++) {
                Row row = sheet.createRow(rowNum + 1);
                row.setHeightInPoints(24); // Độ cao hàng dữ liệu thoáng đãng, dễ đọc

                Object[] rowData = data[rowNum];
                boolean isEven = (rowNum % 2 == 0); // Hàng dữ liệu chẵn/lẻ để tô màu sọc

                for (int colNum = 0; colNum < columns.length; colNum++) {
                    Cell cell = row.createCell(colNum);
                    Object val = rowData[colNum];

                    // Chọn cell style tương ứng với hàng chẵn/lẻ
                    CellStyle currentTextStyle = isEven ? evenRowStyle : oddRowStyle;
                    CellStyle currentCenterStyle = isEven ? evenCenterStyle : oddCenterStyle;
                    CellStyle currentNumberStyle = isEven ? evenNumberStyle : oddNumberStyle;

                    if (val instanceof String) {
                        cell.setCellValue((String) val);
                        String colName = columns[colNum];
                        if (colName.contains("Ngày") || colName.contains("giờ")) {
                            cell.setCellStyle(currentCenterStyle);
                        } else {
                            cell.setCellStyle(currentTextStyle);
                        }
                    } else if (val instanceof Double) {
                        cell.setCellValue((Double) val);
                        cell.setCellStyle(currentNumberStyle);
                    } else {
                        cell.setCellValue("");
                        cell.setCellStyle(currentTextStyle);
                    }
                }
            }

            // [NÂNG CẤP CLAUDE 3] Thêm bộ lọc AutoFilter tự động cho tất cả các cột
            org.apache.poi.ss.util.CellRangeAddress filterRange = new org.apache.poi.ss.util.CellRangeAddress(
                0, data.length, 0, columns.length - 1
            );
            sheet.setAutoFilter(filterRange);

            // 8. Tự động căn chỉnh độ rộng cột + đệm lề an toàn
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1500); // Tăng đệm lề thêm thoáng đãng
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            return bos.toByteArray();
        } catch (Exception e) {
            log.error("Error generating Excel template with Apache POI", e);
            throw new IllegalStateException("Failed to generate Excel template: " + e.getMessage(), e);
        }
    }
}
