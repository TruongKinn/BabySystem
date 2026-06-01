package com.mom.expense.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "invoices")
public class InvoiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "invoice_no", nullable = false, length = 50)
    private String invoiceNo;

    @Column(name = "issue_date", nullable = false)
    private OffsetDateTime issueDate;

    @Column(name = "due_date", nullable = false)
    private OffsetDateTime dueDate;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "seller_name", nullable = false, length = 150)
    private String sellerName;

    @Column(name = "seller_email", length = 100)
    private String sellerEmail;

    @Column(name = "seller_phone", length = 30)
    private String sellerPhone;

    @Column(name = "seller_address", length = 255)
    private String sellerAddress;

    @Column(name = "buyer_name", nullable = false, length = 150)
    private String buyerName;

    @Column(name = "buyer_email", length = 100)
    private String buyerEmail;

    @Column(name = "buyer_phone", length = 30)
    private String buyerPhone;

    @Column(name = "buyer_address", length = 255)
    private String buyerAddress;

    @Column(name = "discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "vat_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal vatPercent;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 1000)
    private String notes;

    @Column(name = "file_metadata_id", length = 100)
    private String fileMetadataId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "authorized_signer", length = 100)
    private String authorizedSigner;

    @Column(name = "is_digitally_signed", nullable = false)
    private boolean isDigitallySigned = false;

    @Column(name = "signature_otp", length = 6)
    private String signatureOtp;

    @Column(name = "signed_at")
    private OffsetDateTime signedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItemEntity> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
