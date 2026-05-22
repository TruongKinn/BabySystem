package com.mom.expense.exchangerate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExchangeRateScheduler {

    private final ExchangeRateService exchangeRateService;

    /**
     * Tự động refresh tỷ giá 3 lần mỗi ngày: 8:00, 12:00, 16:00 (UTC).
     * Vietcombank thường cập nhật tỷ giá trong giờ làm việc.
     */
    @Scheduled(cron = "${exchange-rate.scheduler.cron:0 0 1,5,9 * * *}")
    public void refreshExchangeRates() {
        log.info("Scheduled exchange rate refresh started");
        try {
            exchangeRateService.fetchAndRefresh();
            log.info("Scheduled exchange rate refresh completed");
        } catch (Exception e) {
            log.error("Scheduled exchange rate refresh failed: {}", e.getMessage(), e);
        }
    }
}
