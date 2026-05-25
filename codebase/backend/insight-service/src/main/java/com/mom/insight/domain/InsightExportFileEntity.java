package com.mom.insight.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "insight_export_files")
public class InsightExportFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "report_month", nullable = false, length = 7)
    private String reportMonth;

    @Column(name = "file_name", nullable = false, length = 180, unique = true)
    private String fileName;

    @Column(name = "password_hash", nullable = false, length = 128)
    private String passwordHash;

    @Column(name = "password_salt", nullable = false, length = 64)
    private String passwordSalt;

    @Column(name = "password_algorithm", nullable = false, length = 80)
    private String passwordAlgorithm;

    @Column(name = "password_masked", nullable = false, length = 24)
    private String passwordMasked;

    @Column(name = "password_raw", nullable = false, length = 128)
    private String passwordRaw;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(name = "exported_by_user_id")
    private Long exportedByUserId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
