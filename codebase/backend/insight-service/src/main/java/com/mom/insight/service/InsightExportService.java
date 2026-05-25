package com.mom.insight.service;

import com.mom.common.context.UserContext;
import com.mom.insight.controller.dto.InsightExportFilePageResponse;
import com.mom.insight.controller.dto.InsightExportFileResponse;
import com.mom.insight.controller.dto.InsightExportRequest;
import com.mom.insight.controller.dto.InsightMonthlyResponse;
import com.mom.insight.domain.InsightExportFileEntity;
import com.mom.insight.repository.InsightExportFileRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.poifs.crypt.EncryptionInfo;
import org.apache.poi.poifs.crypt.EncryptionMode;
import org.apache.poi.poifs.crypt.Encryptor;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InsightExportService {

    private static final String XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String PASSWORD_ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int PASSWORD_ITERATIONS = 120_000;
    private static final int PASSWORD_KEY_LENGTH = 256;
    private static final int PASSWORD_SALT_LENGTH = 16;
    private static final DateTimeFormatter FILE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final InsightService insightService;
    private final InsightExportFileRepository exportFileRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public String xlsxContentType() {
        return XLSX_CONTENT_TYPE;
    }

    @Transactional
    public InsightExportResult exportMonthly(InsightExportRequest request) {
        YearMonth month = parseMonth(request.month());
        String password = validatePassword(request.password());
        InsightMonthlyResponse report = insightService.getMonthly(request.familyId(), month);
        List<DailyExportItem> dailyItems = buildDailyItems(report.dailyBreakdown());
        String fileName = buildFileName(report.familyId(), month);

        byte[] workbook = createWorkbook(report, dailyItems, request, fileName);
        byte[] encryptedWorkbook = encryptWorkbook(workbook, password);
        PasswordHash passwordHash = hashPassword(password);

        InsightExportFileEntity entity = new InsightExportFileEntity();
        entity.setFamilyId(report.familyId());
        entity.setReportMonth(month.toString());
        entity.setFileName(fileName);
        entity.setPasswordHash(passwordHash.hash());
        entity.setPasswordSalt(passwordHash.salt());
        entity.setPasswordAlgorithm(passwordHash.algorithm());
        entity.setPasswordMasked(maskPassword(password));
        entity.setPasswordRaw(password);
        entity.setFileSizeBytes(encryptedWorkbook.length);
        entity.setExportedByUserId(UserContext.getUserId());
        exportFileRepository.save(entity);

        return new InsightExportResult(fileName, encryptedWorkbook);
    }

    @Transactional(readOnly = true)
    public InsightExportFilePageResponse listExportPasswordRecords(
            Long userId,
            Long familyId,
            String month,
            int page,
            int size
    ) {
        requireAdmin();
        validateOptionalMonth(month);

        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.min(100, Math.max(size, 1));
        Specification<InsightExportFileEntity> specification = buildExportFileSpecification(userId, familyId, month);
        Page<InsightExportFileEntity> result = exportFileRepository.findAll(
                specification,
                PageRequest.of(normalizedPage, normalizedSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        return new InsightExportFilePageResponse(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getContent().stream().map(this::toResponse).toList()
        );
    }

    @Transactional
    public void deleteExportPasswordRecord(Long id) {
        requireAdmin();
        InsightExportFileEntity entity = exportFileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Export password record not found"));
        exportFileRepository.delete(entity);
    }

    private YearMonth parseMonth(String rawMonth) {
        if (rawMonth == null || rawMonth.isBlank()) {
            return YearMonth.now(ZoneOffset.UTC);
        }
        try {
            return YearMonth.parse(rawMonth);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("month must use yyyy-MM format", ex);
        }
    }

    private String validatePassword(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("password must not be blank");
        }
        if (rawPassword.length() < 8 || rawPassword.length() > 128) {
            throw new IllegalArgumentException("password length must be between 8 and 128");
        }
        return rawPassword;
    }

    private void requireAdmin() {
        if (!UserContext.isAdmin()) {
            throw new AccessDeniedException("Admin access required");
        }
    }

    private void validateOptionalMonth(String month) {
        if (month != null && !month.isBlank()) {
            parseMonth(month);
        }
    }

    private Specification<InsightExportFileEntity> buildExportFileSpecification(Long userId, Long familyId, String month) {
        return (root, query, criteriaBuilder) -> {
            var predicate = criteriaBuilder.conjunction();
            if (userId != null) {
                predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("exportedByUserId"), userId));
            }
            if (familyId != null) {
                predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("familyId"), familyId));
            }
            if (month != null && !month.isBlank()) {
                predicate = criteriaBuilder.and(predicate, criteriaBuilder.equal(root.get("reportMonth"), month));
            }
            return predicate;
        };
    }

    private InsightExportFileResponse toResponse(InsightExportFileEntity entity) {
        String passwordRaw = entity.getPasswordRaw() != null
                ? entity.getPasswordRaw()
                : entity.getPasswordMasked();
        return new InsightExportFileResponse(
                entity.getId(),
                entity.getFamilyId(),
                entity.getReportMonth(),
                entity.getFileName(),
                entity.getPasswordMasked(),
                passwordRaw,
                entity.getPasswordAlgorithm(),
                entity.getFileSizeBytes(),
                entity.getExportedByUserId(),
                entity.getCreatedAt()
        );
    }

    private List<DailyExportItem> buildDailyItems(List<InsightMonthlyResponse.DailyItem> source) {
        BigDecimal averageExpense = source.isEmpty()
                ? BigDecimal.ZERO
                : source.stream()
                    .map(InsightMonthlyResponse.DailyItem::expenseTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(source.size()), 2, RoundingMode.HALF_UP);

        return source.stream()
                .map(item -> {
                    RiskLevel riskLevel = resolveRiskLevel(item, averageExpense);
                    return new DailyExportItem(
                            item.date(),
                            item.expenseTotal(),
                            item.pendingTasks(),
                            item.babySleepHours(),
                            riskLevel,
                            buildRiskReason(item, averageExpense)
                    );
                })
                .toList();
    }

    private RiskLevel resolveRiskLevel(InsightMonthlyResponse.DailyItem item, BigDecimal averageExpense) {
        BigDecimal highExpenseThreshold = averageExpense.multiply(BigDecimal.valueOf(1.6));
        BigDecimal warningExpenseThreshold = averageExpense.multiply(BigDecimal.valueOf(1.15));

        if (
                item.pendingTasks() >= 5 ||
                item.babySleepHours().compareTo(BigDecimal.valueOf(6)) < 0 ||
                (averageExpense.signum() > 0 && item.expenseTotal().compareTo(highExpenseThreshold) >= 0)
        ) {
            return RiskLevel.CRITICAL;
        }

        if (
                item.pendingTasks() >= 3 ||
                item.babySleepHours().compareTo(BigDecimal.valueOf(8)) < 0 ||
                (averageExpense.signum() > 0 && item.expenseTotal().compareTo(warningExpenseThreshold) >= 0)
        ) {
            return RiskLevel.WARNING;
        }

        return RiskLevel.GOOD;
    }

    private String buildRiskReason(InsightMonthlyResponse.DailyItem item, BigDecimal averageExpense) {
        StringBuilder reason = new StringBuilder();
        if (item.pendingTasks() >= 3) {
            appendReason(reason, item.pendingTasks() + " pending tasks");
        }
        if (item.babySleepHours().compareTo(BigDecimal.valueOf(8)) < 0) {
            appendReason(reason, "sleep below target");
        }
        if (averageExpense.signum() > 0 && item.expenseTotal().compareTo(averageExpense.multiply(BigDecimal.valueOf(1.15))) >= 0) {
            appendReason(reason, "expense above daily average");
        }
        return reason.length() == 0 ? "Stable day" : reason.toString();
    }

    private void appendReason(StringBuilder target, String value) {
        if (target.length() > 0) {
            target.append(" | ");
        }
        target.append(value);
    }

    private byte[] createWorkbook(
            InsightMonthlyResponse report,
            List<DailyExportItem> dailyItems,
            InsightExportRequest request,
            String fileName
    ) {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            WorkbookStyles styles = createStyles(workbook, normalizeCurrency(request.currency()));
            createOverviewSheet(workbook, styles, report, dailyItems, request, fileName);
            createDailySheet(workbook, styles, report, dailyItems);

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to create insight workbook", ex);
        }
    }

    private void createOverviewSheet(
            XSSFWorkbook workbook,
            WorkbookStyles styles,
            InsightMonthlyResponse report,
            List<DailyExportItem> dailyItems,
            InsightExportRequest request,
            String fileName
    ) {
        var sheet = workbook.createSheet("Overview");
        workbook.setSheetOrder("Overview", 0);
        sheet.setDisplayGridlines(false);
        sheet.createFreezePane(0, 7);
        setOverviewWidths(sheet);

        int rowIndex = 0;
        Row titleRow = sheet.createRow(rowIndex++);
        titleRow.setHeightInPoints(34);
        merge(sheet, 0, 0, 0, 7);
        setCell(titleRow, 0, "Family Insights Report", styles.title());

        Row subtitleRow = sheet.createRow(rowIndex++);
        subtitleRow.setHeightInPoints(25);
        merge(sheet, 1, 1, 0, 7);
        setCell(subtitleRow, 0, "A password-protected monthly operations workbook", styles.subtitle());

        rowIndex++;
        Row metaRow = sheet.createRow(rowIndex++);
        setCell(metaRow, 0, "File name", styles.label());
        setCell(metaRow, 1, fileName, styles.value());
        setCell(metaRow, 3, "Generated at", styles.label());
        setCell(metaRow, 4, OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")), styles.value());

        Row metaRow2 = sheet.createRow(rowIndex++);
        setCell(metaRow2, 0, "Family", styles.label());
        setCell(metaRow2, 1, cleanText(request.familyName(), "Family #" + report.familyId()), styles.value());
        setCell(metaRow2, 3, "Report month", styles.label());
        setCell(metaRow2, 4, report.month(), styles.value());
        setCell(metaRow2, 6, "Currency", styles.label());
        setCell(metaRow2, 7, normalizeCurrency(request.currency()), styles.value());

        rowIndex++;
        Row sectionRow = sheet.createRow(rowIndex++);
        merge(sheet, sectionRow.getRowNum(), sectionRow.getRowNum(), 0, 7);
        setCell(sectionRow, 0, "Executive summary", styles.section());

        Row cardHeader = sheet.createRow(rowIndex++);
        setCell(cardHeader, 0, "Metric", styles.tableHeader());
        setCell(cardHeader, 1, "Value", styles.tableHeader());
        setCell(cardHeader, 2, "Metric", styles.tableHeader());
        setCell(cardHeader, 3, "Value", styles.tableHeader());
        setCell(cardHeader, 4, "Metric", styles.tableHeader());
        setCell(cardHeader, 5, "Value", styles.tableHeader());
        setCell(cardHeader, 6, "Metric", styles.tableHeader());
        setCell(cardHeader, 7, "Value", styles.tableHeader());

        Row scoreRow = sheet.createRow(rowIndex++);
        setCell(scoreRow, 0, "Task completion", styles.metricLabel());
        setCell(scoreRow, 1, taskCompletionRate(report), styles.percent());
        setCell(scoreRow, 2, "Sleep score", styles.metricLabel());
        setCell(scoreRow, 3, sleepScore(report), styles.percent());
        setCell(scoreRow, 4, "Critical days", styles.metricLabel());
        setCell(scoreRow, 5, dailyItems.stream().filter(item -> item.riskLevel() == RiskLevel.CRITICAL).count(), styles.integer());
        setCell(scoreRow, 6, "Report days", styles.metricLabel());
        setCell(scoreRow, 7, dailyItems.size(), styles.integer());

        Row totalRow = sheet.createRow(rowIndex++);
        setCell(totalRow, 0, "Monthly expense", styles.metricLabel());
        setCell(totalRow, 1, report.expenseTotal(), styles.currency());
        setCell(totalRow, 2, "Expense count", styles.metricLabel());
        setCell(totalRow, 3, report.expenseCount(), styles.integer());
        setCell(totalRow, 4, "Meals planned", styles.metricLabel());
        setCell(totalRow, 5, report.mealsPlanned(), styles.integer());
        setCell(totalRow, 6, "Pending gap", styles.metricLabel());
        setCell(totalRow, 7, Math.max(0, report.tasksCreated() - report.tasksCompleted()), styles.integer());

        Row babyRow = sheet.createRow(rowIndex++);
        setCell(babyRow, 0, "Baby sleep hours", styles.metricLabel());
        setCell(babyRow, 1, report.babySleepHours(), styles.decimal());
        setCell(babyRow, 2, "Feedings", styles.metricLabel());
        setCell(babyRow, 3, report.babyFeedings(), styles.integer());
        setCell(babyRow, 4, "Diaper changes", styles.metricLabel());
        setCell(babyRow, 5, report.diaperChanges(), styles.integer());
        setCell(babyRow, 6, "Tasks completed", styles.metricLabel());
        setCell(babyRow, 7, report.tasksCompleted(), styles.integer());

        rowIndex++;
        Row noteRow = sheet.createRow(rowIndex++);
        merge(sheet, noteRow.getRowNum(), noteRow.getRowNum(), 0, 7);
        setCell(noteRow, 0, "The workbook is encrypted with the password entered in the export dialog. Keep it separate from the downloaded file.", styles.note());
    }

    private void createDailySheet(
            XSSFWorkbook workbook,
            WorkbookStyles styles,
            InsightMonthlyResponse report,
            List<DailyExportItem> dailyItems
    ) {
        var sheet = workbook.createSheet("Daily Breakdown");
        sheet.setDisplayGridlines(false);
        sheet.createFreezePane(0, 3);
        setDailyWidths(sheet);

        Row titleRow = sheet.createRow(0);
        titleRow.setHeightInPoints(30);
        merge(sheet, 0, 0, 0, 6);
        setCell(titleRow, 0, "Daily Breakdown - " + report.month(), styles.title());

        Row subtitle = sheet.createRow(1);
        merge(sheet, 1, 1, 0, 6);
        setCell(subtitle, 0, "Risk is calculated from pending tasks, baby sleep hours, and expense spikes.", styles.subtitleLight());

        Row header = sheet.createRow(2);
        String[] headers = {"Date", "Expense", "Pending tasks", "Sleep hours", "Risk level", "Risk reason", "Notes"};
        for (int i = 0; i < headers.length; i++) {
            setCell(header, i, headers[i], styles.tableHeader());
        }

        int rowIndex = 3;
        for (DailyExportItem item : dailyItems) {
            Row row = sheet.createRow(rowIndex++);
            setCell(row, 0, item.date(), styles.tableCell());
            setCell(row, 1, item.expenseTotal(), styles.currency());
            setCell(row, 2, item.pendingTasks(), styles.integer());
            setCell(row, 3, item.babySleepHours(), styles.decimal());
            setCell(row, 4, item.riskLevel().label(), styles.risk(item.riskLevel()));
            setCell(row, 5, item.riskReason(), styles.tableCell());
            setCell(row, 6, "", styles.tableCell());
        }

        if (!dailyItems.isEmpty()) {
            sheet.setAutoFilter(new CellRangeAddress(2, dailyItems.size() + 2, 0, 6));
        }
    }

    private WorkbookStyles createStyles(XSSFWorkbook workbook, String currency) {
        DataFormat dataFormat = workbook.createDataFormat();

        XSSFCellStyle title = filledStyle(workbook, "123A5A", "FFFFFF", 20, true, HorizontalAlignment.LEFT);
        title.setVerticalAlignment(VerticalAlignment.CENTER);

        XSSFCellStyle subtitle = filledStyle(workbook, "2563EB", "FFFFFF", 11, false, HorizontalAlignment.LEFT);
        XSSFCellStyle subtitleLight = filledStyle(workbook, "EAF2FF", "1F2937", 11, false, HorizontalAlignment.LEFT);
        XSSFCellStyle section = filledStyle(workbook, "E0F2FE", "0F172A", 13, true, HorizontalAlignment.LEFT);
        XSSFCellStyle tableHeader = filledStyle(workbook, "0F766E", "FFFFFF", 11, true, HorizontalAlignment.CENTER);

        XSSFCellStyle label = baseStyle(workbook, "F8FAFC", "475569", 10, true, HorizontalAlignment.LEFT);
        XSSFCellStyle value = baseStyle(workbook, "FFFFFF", "0F172A", 11, false, HorizontalAlignment.LEFT);
        XSSFCellStyle metricLabel = baseStyle(workbook, "F8FAFC", "334155", 10, true, HorizontalAlignment.LEFT);
        XSSFCellStyle tableCell = baseStyle(workbook, "FFFFFF", "0F172A", 10, false, HorizontalAlignment.LEFT);
        XSSFCellStyle note = baseStyle(workbook, "FFF7ED", "9A3412", 11, true, HorizontalAlignment.LEFT);

        XSSFCellStyle integer = cloneWithFormat(workbook, tableCell, dataFormat.getFormat("#,##0"));
        XSSFCellStyle decimal = cloneWithFormat(workbook, tableCell, dataFormat.getFormat("#,##0.0"));
        XSSFCellStyle percent = cloneWithFormat(workbook, tableCell, dataFormat.getFormat("0%"));
        XSSFCellStyle currencyStyle = cloneWithFormat(workbook, tableCell, dataFormat.getFormat(currencyFormat(currency)));

        XSSFCellStyle goodRisk = baseStyle(workbook, "DCFCE7", "166534", 10, true, HorizontalAlignment.CENTER);
        XSSFCellStyle warningRisk = baseStyle(workbook, "FEF3C7", "92400E", 10, true, HorizontalAlignment.CENTER);
        XSSFCellStyle criticalRisk = baseStyle(workbook, "FEE2E2", "991B1B", 10, true, HorizontalAlignment.CENTER);

        return new WorkbookStyles(
                title,
                subtitle,
                subtitleLight,
                section,
                tableHeader,
                label,
                value,
                metricLabel,
                tableCell,
                integer,
                decimal,
                percent,
                currencyStyle,
                note,
                goodRisk,
                warningRisk,
                criticalRisk
        );
    }

    private XSSFCellStyle baseStyle(
            XSSFWorkbook workbook,
            String fillHex,
            String fontHex,
            int fontSize,
            boolean bold,
            HorizontalAlignment alignment
    ) {
        XSSFCellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(color(fillHex));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(alignment);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        XSSFFont font = workbook.createFont();
        font.setFontName("Aptos");
        font.setFontHeightInPoints((short) fontSize);
        font.setBold(bold);
        font.setColor(color(fontHex));
        style.setFont(font);
        return style;
    }

    private XSSFCellStyle filledStyle(
            XSSFWorkbook workbook,
            String fillHex,
            String fontHex,
            int fontSize,
            boolean bold,
            HorizontalAlignment alignment
    ) {
        XSSFCellStyle style = baseStyle(workbook, fillHex, fontHex, fontSize, bold, alignment);
        style.setBorderBottom(BorderStyle.NONE);
        style.setBorderTop(BorderStyle.NONE);
        style.setBorderLeft(BorderStyle.NONE);
        style.setBorderRight(BorderStyle.NONE);
        return style;
    }

    private XSSFCellStyle cloneWithFormat(XSSFWorkbook workbook, XSSFCellStyle base, short format) {
        XSSFCellStyle style = workbook.createCellStyle();
        style.cloneStyleFrom(base);
        style.setDataFormat(format);
        return style;
    }

    private XSSFColor color(String hex) {
        String normalized = hex.replace("#", "");
        byte[] rgb = new byte[] {
                (byte) Integer.parseInt(normalized.substring(0, 2), 16),
                (byte) Integer.parseInt(normalized.substring(2, 4), 16),
                (byte) Integer.parseInt(normalized.substring(4, 6), 16)
        };
        return new XSSFColor(rgb, new DefaultIndexedColorMap());
    }

    private void setCell(Row row, int column, Object value, CellStyle style) {
        Cell cell = row.createCell(column);
        if (value instanceof BigDecimal decimal) {
            cell.setCellValue(decimal.doubleValue());
        } else if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else {
            cell.setCellValue(value == null ? "" : String.valueOf(value));
        }
        cell.setCellStyle(style);
    }

    private void merge(org.apache.poi.ss.usermodel.Sheet sheet, int firstRow, int lastRow, int firstCol, int lastCol) {
        sheet.addMergedRegion(new CellRangeAddress(firstRow, lastRow, firstCol, lastCol));
    }

    private void setOverviewWidths(org.apache.poi.ss.usermodel.Sheet sheet) {
        int[] widths = {22, 18, 4, 22, 18, 4, 22, 18};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    private void setDailyWidths(org.apache.poi.ss.usermodel.Sheet sheet) {
        int[] widths = {16, 18, 16, 14, 15, 36, 28};
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }
    }

    private byte[] encryptWorkbook(byte[] workbookBytes, String password) {
        try (
                POIFSFileSystem fileSystem = new POIFSFileSystem();
                OPCPackage packageFile = OPCPackage.open(new ByteArrayInputStream(workbookBytes))
        ) {
            EncryptionInfo info = new EncryptionInfo(EncryptionMode.agile);
            Encryptor encryptor = info.getEncryptor();
            encryptor.confirmPassword(password);

            try (OutputStream encryptedStream = encryptor.getDataStream(fileSystem)) {
                packageFile.save(encryptedStream);
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                fileSystem.writeFilesystem(out);
                return out.toByteArray();
            }
        } catch (IOException | GeneralSecurityException | InvalidFormatException ex) {
            throw new IllegalStateException("Failed to encrypt insight workbook", ex);
        }
    }

    private PasswordHash hashPassword(String password) {
        byte[] salt = new byte[PASSWORD_SALT_LENGTH];
        secureRandom.nextBytes(salt);
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH);
        try {
            byte[] hash = SecretKeyFactory.getInstance(PASSWORD_ALGORITHM).generateSecret(spec).getEncoded();
            return new PasswordHash(
                    PASSWORD_ALGORITHM + ":" + PASSWORD_ITERATIONS,
                    Base64.getEncoder().encodeToString(salt),
                    Base64.getEncoder().encodeToString(hash)
            );
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to hash export password", ex);
        } finally {
            spec.clearPassword();
        }
    }

    private String maskPassword(String password) {
        int length = Math.min(12, Math.max(8, password.length()));
        return "*".repeat(length);
    }

    private String buildFileName(Long familyId, YearMonth month) {
        String timestamp = LocalDateTime.now(ZoneOffset.UTC).format(FILE_TIME_FORMAT);
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        return "MOM_INSIGHTS_F" + familyId + "_" + month.toString().replace("-", "") + "_" + timestamp + "_" + suffix + ".xlsx";
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return "VND";
        }
        return currency.trim().toUpperCase(Locale.ROOT);
    }

    private String cleanText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.replaceAll("[\\r\\n\\t]+", " ").trim();
    }

    private String currencyFormat(String currency) {
        return "VND".equalsIgnoreCase(currency) ? "#,##0" : "#,##0.00";
    }

    private double taskCompletionRate(InsightMonthlyResponse report) {
        if (report.tasksCreated() <= 0) {
            return 1D;
        }
        return BigDecimal.valueOf(report.tasksCompleted())
                .divide(BigDecimal.valueOf(report.tasksCreated()), 4, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private double sleepScore(InsightMonthlyResponse report) {
        int days = Math.max(1, report.dailyBreakdown().size());
        BigDecimal target = BigDecimal.valueOf(days).multiply(BigDecimal.valueOf(12));
        BigDecimal score = report.babySleepHours().divide(target, 4, RoundingMode.HALF_UP);
        return score.min(BigDecimal.ONE).doubleValue();
    }

    private record DailyExportItem(
            String date,
            BigDecimal expenseTotal,
            long pendingTasks,
            BigDecimal babySleepHours,
            RiskLevel riskLevel,
            String riskReason
    ) {
    }

    private record PasswordHash(String algorithm, String salt, String hash) {
    }

    private enum RiskLevel {
        GOOD("Good"),
        WARNING("Warning"),
        CRITICAL("Critical");

        private final String label;

        RiskLevel(String label) {
            this.label = label;
        }

        private String label() {
            return label;
        }
    }

    private record WorkbookStyles(
            XSSFCellStyle title,
            XSSFCellStyle subtitle,
            XSSFCellStyle subtitleLight,
            XSSFCellStyle section,
            XSSFCellStyle tableHeader,
            XSSFCellStyle label,
            XSSFCellStyle value,
            XSSFCellStyle metricLabel,
            XSSFCellStyle tableCell,
            XSSFCellStyle integer,
            XSSFCellStyle decimal,
            XSSFCellStyle percent,
            XSSFCellStyle currency,
            XSSFCellStyle note,
            XSSFCellStyle goodRisk,
            XSSFCellStyle warningRisk,
            XSSFCellStyle criticalRisk
    ) {
        private XSSFCellStyle risk(RiskLevel level) {
            return switch (level) {
                case GOOD -> goodRisk;
                case WARNING -> warningRisk;
                case CRITICAL -> criticalRisk;
            };
        }
    }
}
