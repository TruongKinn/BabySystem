package com.mom.expense.repository;

import com.mom.expense.domain.InvoiceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, Long> {

    Page<InvoiceEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId, Pageable pageable);

    Page<InvoiceEntity> findByFamilyIdAndInvoiceNoContainingIgnoreCaseOrderByCreatedAtDesc(
            Long familyId,
            String invoiceNo,
            Pageable pageable
    );
}
