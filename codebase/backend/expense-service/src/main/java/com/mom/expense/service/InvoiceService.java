package com.mom.expense.service;

import com.mom.expense.controller.dto.CreateInvoiceRequest;
import com.mom.expense.controller.dto.InvoicePageResponse;
import com.mom.expense.controller.dto.InvoiceResponse;

public interface InvoiceService {
    InvoiceResponse createInvoice(CreateInvoiceRequest request);
    InvoiceResponse getInvoice(Long id);
    InvoicePageResponse getInvoicesPage(Long familyId, String keyword, int page, int size);
    void deleteInvoice(Long id);
    void sendSignatureOtp(String invoiceNo);
    void verifySignatureOtp(String invoiceNo, String otpCode);
}
