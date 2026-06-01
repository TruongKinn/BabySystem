package com.mom.expense.service;

import com.mom.common.exception.ResourceNotFoundException;
import com.mom.expense.controller.dto.CreateInvoiceItemRequest;
import com.mom.expense.controller.dto.CreateInvoiceRequest;
import com.mom.expense.controller.dto.InvoicePageResponse;
import com.mom.expense.controller.dto.InvoiceResponse;
import com.mom.expense.domain.InvoiceEntity;
import com.mom.expense.domain.InvoiceItemEntity;
import com.mom.expense.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;

    @Override
    @Transactional
    public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
        InvoiceEntity invoice = new InvoiceEntity();
        invoice.setFamilyId(request.familyId());
        invoice.setInvoiceNo(request.invoiceNo());
        invoice.setIssueDate(request.issueDate());
        invoice.setDueDate(request.dueDate());
        invoice.setCurrency(request.currency());
        invoice.setSellerName(request.sellerName());
        invoice.setSellerEmail(request.sellerEmail());
        invoice.setSellerPhone(request.sellerPhone());
        invoice.setSellerAddress(request.sellerAddress());
        invoice.setBuyerName(request.buyerName());
        invoice.setBuyerEmail(request.buyerEmail());
        invoice.setBuyerPhone(request.buyerPhone());
        invoice.setBuyerAddress(request.buyerAddress());
        invoice.setDiscountPercent(request.discountPercent());
        invoice.setVatPercent(request.vatPercent());
        invoice.setTotalAmount(request.totalAmount());
        invoice.setNotes(request.notes());
        invoice.setFileMetadataId(request.fileMetadataId());
        invoice.setAuthorizedSigner(request.authorizedSigner());
        invoice.setDigitallySigned(request.isDigitallySigned() != null ? request.isDigitallySigned() : false);
        invoice.setSignatureOtp(request.signatureOtp());
        invoice.setSignedAt(request.signedAt());

        List<InvoiceItemEntity> items = new ArrayList<>();
        for (CreateInvoiceItemRequest itemReq : request.items()) {
            InvoiceItemEntity item = new InvoiceItemEntity();
            item.setInvoice(invoice);
            item.setName(itemReq.name());
            item.setQuantity(itemReq.quantity());
            item.setPrice(itemReq.price());
            item.setTax(itemReq.tax());
            items.add(item);
        }
        invoice.setItems(items);

        InvoiceEntity saved = invoiceRepository.save(invoice);
        return InvoiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoicePageResponse getInvoicesPage(Long familyId, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceEntity> invoicePage;
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            invoicePage = invoiceRepository.findByFamilyIdAndInvoiceNoContainingIgnoreCaseOrderByCreatedAtDesc(
                    familyId,
                    keyword.trim(),
                    pageable
            );
        } else {
            invoicePage = invoiceRepository.findByFamilyIdOrderByCreatedAtDesc(familyId, pageable);
        }

        List<InvoiceResponse> dtoList = invoicePage.getContent().stream()
                .map(InvoiceResponse::fromEntity)
                .toList();

        return new InvoicePageResponse(
                dtoList,
                invoicePage.getTotalElements(),
                invoicePage.getNumber(),
                invoicePage.getSize()
        );
    }

    @Override
    @Transactional
    public void deleteInvoice(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Invoice not found");
        }
        invoiceRepository.deleteById(id);
    }
}
