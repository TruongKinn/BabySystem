package com.mom.expense.controller.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record CreateInvoiceRequest(
        @NotNull Long familyId,
        @NotBlank String invoiceNo,
        @NotNull OffsetDateTime issueDate,
        @NotNull OffsetDateTime dueDate,
        @NotBlank String currency,
        @NotBlank String sellerName,
        String sellerEmail,
        String sellerPhone,
        String sellerAddress,
        @NotBlank String buyerName,
        String buyerEmail,
        String buyerPhone,
        String buyerAddress,
        @NotNull BigDecimal discountPercent,
        @NotNull BigDecimal vatPercent,
        @NotNull BigDecimal totalAmount,
        String notes,
        String fileMetadataId,
        String authorizedSigner,
        Boolean isDigitallySigned,
        String signatureOtp,
        OffsetDateTime signedAt,
        @NotNull @Valid List<CreateInvoiceItemRequest> items
) {}
