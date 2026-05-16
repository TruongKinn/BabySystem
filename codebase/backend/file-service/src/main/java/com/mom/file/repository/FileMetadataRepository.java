package com.mom.file.repository;

import com.mom.file.domain.FileMetadataEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends JpaRepository<FileMetadataEntity, Long> {

    Optional<FileMetadataEntity> findByIdAndDeletedFalse(Long id);

    List<FileMetadataEntity> findByFamilyIdAndDeletedFalseOrderByCreatedAtDesc(Long familyId);

    List<FileMetadataEntity> findByFamilyIdAndBucketNameAndDeletedFalseOrderByCreatedAtDesc(Long familyId, String bucketName);

    List<FileMetadataEntity> findByFamilyIdAndFileTagAndDeletedFalseOrderByCreatedAtDesc(Long familyId, String fileTag);

    List<FileMetadataEntity> findByFamilyIdAndBucketNameAndFileTagAndDeletedFalseOrderByCreatedAtDesc(
            Long familyId,
            String bucketName,
            String fileTag
    );
}
