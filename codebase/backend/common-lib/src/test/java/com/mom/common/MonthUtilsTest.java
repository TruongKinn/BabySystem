package com.mom.common;

import com.mom.common.utils.MonthUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class MonthUtilsTest {

    @Test
    void parseMonthShouldWork() {
        Assertions.assertEquals("2026-05", MonthUtils.parse("2026-05").toString());
    }
}
