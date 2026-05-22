package com.mom.expense.exchangerate;

import com.mom.expense.controller.dto.ConvertCurrencyResponse;
import com.mom.expense.controller.dto.ExchangeRateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExchangeRateService {

    private static final String FEATURE_KEY = "currency_exchange";
    private static final String CACHE_NAME = "exchange-rates";
    private static final String CACHE_KEY = "vcb-all";

    private final VietcombankRateFetcher rateFetcher;
    private final PremiumCheckClient premiumCheckClient;
    private final CacheManager cacheManager;

    /**
     * Lấy danh sách tỷ giá. Premium check luôn được thực hiện trước.
     * Data được cache trong Redis, tách biệt với premium gate.
     */
    public List<ExchangeRateResponse> getRates(Long familyId) {
        premiumCheckClient.requireFeature(familyId, FEATURE_KEY);
        return getCachedRates();
    }

    /**
     * Lấy rates từ cache hoặc fetch mới.
     * Dùng CacheManager trực tiếp để tránh Spring @Cacheable self-invocation bug.
     */
    @SuppressWarnings("unchecked")
    public List<ExchangeRateResponse> getCachedRates() {
        Cache cache = cacheManager.getCache(CACHE_NAME);
        if (cache != null) {
            Cache.ValueWrapper wrapper = cache.get(CACHE_KEY);
            if (wrapper != null) {
                log.debug("Exchange rates loaded from cache");
                return (List<ExchangeRateResponse>) wrapper.get();
            }
        }

        List<ExchangeRateResponse> rates = rateFetcher.fetch();

        if (cache != null) {
            cache.put(CACHE_KEY, rates);
        }

        return rates;
    }

    /**
     * Chuyển đổi số tiền ngoại tệ sang VND theo tỷ giá bán của Vietcombank.
     * Chỉ dành cho family có premium feature currency_exchange.
     */
    public ConvertCurrencyResponse convert(Long familyId, String fromCurrency, BigDecimal amount) {
        premiumCheckClient.requireFeature(familyId, FEATURE_KEY);

        String normalizedCurrency = fromCurrency.trim().toUpperCase();

        if ("VND".equals(normalizedCurrency)) {
            OffsetDateTime now = OffsetDateTime.now();
            return new ConvertCurrencyResponse(normalizedCurrency, amount, amount, BigDecimal.ONE, now);
        }

        List<ExchangeRateResponse> rates = getCachedRates();
        ExchangeRateResponse rate = findRate(rates, normalizedCurrency);

        if (rate == null || rate.sellRate() == null) {
            throw new IllegalArgumentException(
                    "Exchange rate not available for currency: " + normalizedCurrency +
                    ". Supported currencies: " + getSupportedCurrencies(rates)
            );
        }

        BigDecimal amountVnd = amount.multiply(rate.sellRate()).setScale(0, RoundingMode.HALF_UP);
        return new ConvertCurrencyResponse(
                normalizedCurrency,
                amount,
                amountVnd,
                rate.sellRate(),
                rate.updatedAt()
        );
    }

    /**
     * Evict cache — được gọi bởi scheduler hoặc manual refresh.
     */
    public void evictCache() {
        Cache cache = cacheManager.getCache(CACHE_NAME);
        if (cache != null) {
            cache.evict(CACHE_KEY);
            log.info("Exchange rate cache evicted");
        }
    }

    public List<ExchangeRateResponse> fetchAndRefresh() {
        evictCache();
        List<ExchangeRateResponse> rates = rateFetcher.fetch();
        Cache cache = cacheManager.getCache(CACHE_NAME);
        if (cache != null) {
            cache.put(CACHE_KEY, rates);
        }
        log.info("Exchange rates refreshed: {} currencies", rates.size());
        return rates;
    }

    private ExchangeRateResponse findRate(List<ExchangeRateResponse> rates, String currency) {
        return rates.stream()
                .filter(r -> currency.equals(r.currency()))
                .findFirst()
                .orElse(null);
    }

    private String getSupportedCurrencies(List<ExchangeRateResponse> rates) {
        return rates.stream()
                .map(ExchangeRateResponse::currency)
                .sorted()
                .collect(Collectors.joining(", "));
    }
}
