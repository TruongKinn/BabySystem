package com.mom.file.repository;

import com.mom.file.domain.FileImportHistoryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileImportHistoryRepository extends JpaRepository<FileImportHistoryEntity, Long> {

    List<FileImportHistoryEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId);

    Page<FileImportHistoryEntity> findByFamilyId(Long familyId, Pageable pageable);
}
