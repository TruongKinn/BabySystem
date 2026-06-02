package com.mom.expense.repository;

import com.mom.expense.domain.OtpSignatureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpSignatureRepository extends JpaRepository<OtpSignatureEntity, Long> {
    Optional<OtpSignatureEntity> findTopByInvoiceNoOrderByCreatedAtDesc(String invoiceNo);
}
