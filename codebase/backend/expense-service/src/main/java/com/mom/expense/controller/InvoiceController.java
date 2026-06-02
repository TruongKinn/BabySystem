package com.mom.expense.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.expense.controller.dto.CreateInvoiceRequest;
import com.mom.expense.controller.dto.InvoicePageResponse;
import com.mom.expense.controller.dto.InvoiceResponse;
import com.mom.expense.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    public ApiResponse<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        return ApiResponse.ok("Invoice created", invoiceService.createInvoice(request));
    }

    @PostMapping("/otp/send")
    public ApiResponse<Object> sendOtp(@RequestParam("invoiceNo") String invoiceNo) {
        invoiceService.sendSignatureOtp(invoiceNo);
        return ApiResponse.ok("OTP sent successfully", null);
    }

    @PostMapping("/otp/verify")
    public ApiResponse<Object> verifyOtp(
            @RequestParam("invoiceNo") String invoiceNo,
            @RequestParam("otpCode") String otpCode
    ) {
        invoiceService.verifySignatureOtp(invoiceNo, otpCode);
        return ApiResponse.ok("OTP verified successfully", null);
    }

    @GetMapping("/{id}")
    public ApiResponse<InvoiceResponse> getInvoice(@PathVariable("id") Long id) {
        return ApiResponse.ok("Success", invoiceService.getInvoice(id));
    }

    @GetMapping
    public ApiResponse<InvoicePageResponse> getInvoices(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        return ApiResponse.ok("Success", invoiceService.getInvoicesPage(familyId, keyword, page, size));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Object> deleteInvoice(@PathVariable("id") Long id) {
        invoiceService.deleteInvoice(id);
        return ApiResponse.ok("Invoice deleted", null);
    }
}
