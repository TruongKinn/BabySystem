package com.mom.expense.controller.dto;

import com.mom.expense.domain.InvoiceEntity;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record InvoiceResponse(
        Long id,
        Long familyId,
        String invoiceNo,
        OffsetDateTime issueDate,
        OffsetDateTime dueDate,
        String currency,
        String sellerName,
        String sellerEmail,
        String sellerPhone,
        String sellerAddress,
        String buyerName,
        String buyerEmail,
        String buyerPhone,
        String buyerAddress,
        BigDecimal discountPercent,
        BigDecimal vatPercent,
        BigDecimal totalAmount,
        String notes,
        String fileMetadataId,
        OffsetDateTime createdAt,
        String authorizedSigner,
        Boolean isDigitallySigned,
        String signatureOtp,
        OffsetDateTime signedAt,
        List<InvoiceItemResponse> items
) {
    public static InvoiceResponse fromEntity(InvoiceEntity entity) {
        return new InvoiceResponse(
                entity.getId(),
                entity.getFamilyId(),
                entity.getInvoiceNo(),
                entity.getIssueDate(),
                entity.getDueDate(),
                entity.getCurrency(),
                entity.getSellerName(),
                entity.getSellerEmail(),
                entity.getSellerPhone(),
                entity.getSellerAddress(),
                entity.getBuyerName(),
                entity.getBuyerEmail(),
                entity.getBuyerPhone(),
                entity.getBuyerAddress(),
                entity.getDiscountPercent(),
                entity.getVatPercent(),
                entity.getTotalAmount(),
                entity.getNotes(),
                entity.getFileMetadataId(),
                entity.getCreatedAt(),
                entity.getAuthorizedSigner(),
                entity.isDigitallySigned(),
                entity.getSignatureOtp(),
                entity.getSignedAt(),
                entity.getItems().stream().map(InvoiceItemResponse::fromEntity).toList()
        );
    }
}
