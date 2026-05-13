package com.mom.common.utils;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class MonthUtils {

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private MonthUtils() {
    }

    public static YearMonth parse(String monthValue) {
        try {
            return YearMonth.parse(monthValue, MONTH_FORMATTER);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Month must follow YYYY-MM");
        }
    }

    public static String format(YearMonth yearMonth) {
        return yearMonth.format(MONTH_FORMATTER);
    }
}
