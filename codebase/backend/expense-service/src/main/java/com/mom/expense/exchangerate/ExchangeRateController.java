package com.mom.expense.exchangerate;

import com.mom.common.dto.ApiResponse;
import com.mom.expense.controller.dto.ConvertCurrencyRequest;
import com.mom.expense.controller.dto.ConvertCurrencyResponse;
import com.mom.expense.controller.dto.ExchangeRateResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/exchange-rates")
@RequiredArgsConstructor
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    /**
     * GET /api/exchange-rates?familyId={familyId}
     * Lấy danh sách tỷ giá ngoại tệ hiện tại từ Vietcombank.
     * Yêu cầu premium feature: currency_exchange.
     */
    @GetMapping
    public ApiResponse<List<ExchangeRateResponse>> getExchangeRates(
            @RequestParam("familyId") Long familyId
    ) {
        return ApiResponse.ok("Success", exchangeRateService.getRates(familyId));
    }

    /**
     * POST /api/exchange-rates/convert
     * Chuyển đổi số tiền ngoại tệ sang VND theo tỷ giá bán Vietcombank.
     * Yêu cầu premium feature: currency_exchange.
     */
    @PostMapping("/convert")
    public ApiResponse<ConvertCurrencyResponse> convertToVnd(
            @Valid @RequestBody ConvertCurrencyRequest request
    ) {
        return ApiResponse.ok("Conversion successful",
                exchangeRateService.convert(request.familyId(), request.fromCurrency(), request.amount()));
    }
}
