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

    public byte[] generateExcelTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Chi tiêu mẫu");
            sheet.setDisplayGridlines(true);

            // Định nghĩa Font Header
            Font headerFont = workbook.createFont();
            headerFont.setFontName("Times New Roman");
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            // Tạo màu cam thương hiệu cho header (#F97316 -> RGB: 249, 115, 22)
            byte[] orangeRGB = new byte[]{(byte) 249, (byte) 115, (byte) 22};
            XSSFColor headerBgColor = new XSSFColor(orangeRGB, new DefaultIndexedColorMap());

            // Cấu hình style Header
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

            // Định nghĩa Font dữ liệu
            Font dataFont = workbook.createFont();
            dataFont.setFontName("Times New Roman");
            dataFont.setFontHeightInPoints((short) 11);

            // Style Dữ liệu Chung
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setFont(dataFont);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Style Ngày chi tiêu (căn giữa)
            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.cloneStyleFrom(dataStyle);
            dateStyle.setAlignment(HorizontalAlignment.CENTER);

            // Style Số tiền (căn phải, định dạng hiển thị #,##0)
            CellStyle amountStyle = workbook.createCellStyle();
            amountStyle.cloneStyleFrom(dataStyle);
            amountStyle.setAlignment(HorizontalAlignment.RIGHT);
            DataFormat format = workbook.createDataFormat();
            amountStyle.setDataFormat(format.getFormat("#,##0"));

            // Định nghĩa cột
            String[] columns = {"Ngày chi tiêu", "Danh mục", "Số tiền", "Ghi chú"};
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(28);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Dữ liệu chi tiêu mẫu
            Object[][] data = {
                {"2026-05-20", "Meals", 150000.0, "Ăn trưa gia đình"},
                {"2026-05-21", "Shopping", 550000.0, "Mua tã bỉm cho bé"},
                {"2026-05-22", "Education", 1200000.0, "Học phí lớp vẽ của bé"}
            };

            for (int rowNum = 0; rowNum < data.length; rowNum++) {
                Row row = sheet.createRow(rowNum + 1);
                row.setHeightInPoints(22);

                Object[] rowData = data[rowNum];

                // Ngày chi tiêu
                Cell cell0 = row.createCell(0);
                cell0.setCellValue((String) rowData[0]);
                cell0.setCellStyle(dateStyle);

                // Danh mục
                Cell cell1 = row.createCell(1);
                cell1.setCellValue((String) rowData[1]);
                cell1.setCellStyle(dataStyle);

                // Số tiền
                Cell cell2 = row.createCell(2);
                cell2.setCellValue((Double) rowData[2]);
                cell2.setCellStyle(amountStyle);

                // Ghi chú
                Cell cell3 = row.createCell(3);
                cell3.setCellValue((String) rowData[3]);
                cell3.setCellStyle(dataStyle);
            }

            // Tự động căn chỉnh độ rộng cột + đệm lề
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, sheet.getColumnWidth(i) + 1200);
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
