package com.mom.file.service;

import com.mom.common.exception.ResourceNotFoundException;
import com.mom.file.controller.dto.FileDownloadUrlResponse;
import com.mom.file.controller.dto.FileMetadataResponse;
import com.mom.file.domain.FileMetadataEntity;
import com.mom.file.repository.FileMetadataRepository;
import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private final FileMetadataRepository fileMetadataRepository;
    private final MinioClient minioClient;

    @Transactional
    public FileMetadataResponse upload(MultipartFile file, Long familyId, Long userId, String bucket, String tag) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("file is required");
        }
        if (familyId == null) {
            throw new IllegalArgumentException("familyId is required");
        }

        String bucketName = normalizeBucket(bucket);
        String objectKey = buildObjectKey(file.getOriginalFilename());

        try {
            ensureBucket(bucketName);
            try (InputStream inputStream = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectKey)
                                .stream(inputStream, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build()
                );
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to upload file to object storage", ex);
        }

        FileMetadataEntity entity = new FileMetadataEntity();
        entity.setFamilyId(familyId);
        entity.setUserId(userId);
        entity.setBucketName(bucketName);
        entity.setObjectKey(objectKey);
        entity.setOriginalFileName(resolveFileName(file.getOriginalFilename()));
        entity.setContentType(file.getContentType());
        entity.setSizeBytes(file.getSize());
        entity.setFileTag(trimToNull(tag));
        entity.setDeleted(false);

        return toResponse(fileMetadataRepository.save(entity));
    }

    public List<FileMetadataResponse> getFiles(Long familyId, String bucket) {
        if (familyId == null) {
            throw new IllegalArgumentException("familyId is required");
        }

        List<FileMetadataEntity> entities = (bucket == null || bucket.isBlank())
                ? fileMetadataRepository.findByFamilyIdAndDeletedFalseOrderByCreatedAtDesc(familyId)
                : fileMetadataRepository.findByFamilyIdAndBucketNameAndDeletedFalseOrderByCreatedAtDesc(
                        familyId,
                        normalizeBucket(bucket)
                );

        return entities.stream().map(this::toResponse).toList();
    }

    public FileMetadataResponse getFile(Long fileId) {
        return toResponse(getEntity(fileId));
    }

    public FileDownloadUrlResponse getDownloadUrl(Long fileId, int expirySeconds) {
        FileMetadataEntity entity = getEntity(fileId);
        int normalizedExpiry = Math.max(60, Math.min(expirySeconds, 7 * 24 * 60 * 60));

        try {
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(entity.getBucketName())
                            .object(entity.getObjectKey())
                            .expiry(normalizedExpiry)
                            .build()
            );
            return new FileDownloadUrlResponse(entity.getId(), url, normalizedExpiry);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate download url", ex);
        }
    }

    @Transactional
    public void deleteFile(Long fileId, boolean deleteObject) {
        FileMetadataEntity entity = getEntity(fileId);
        entity.setDeleted(true);
        fileMetadataRepository.save(entity);

        if (deleteObject) {
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder()
                                .bucket(entity.getBucketName())
                                .object(entity.getObjectKey())
                                .build()
                );
            } catch (Exception ex) {
                log.warn("Failed to delete object {} from bucket {}", entity.getObjectKey(), entity.getBucketName(), ex);
            }
        }
    }

    private FileMetadataEntity getEntity(Long fileId) {
        return fileMetadataRepository.findByIdAndDeletedFalse(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File metadata not found"));
    }

    private FileMetadataResponse toResponse(FileMetadataEntity entity) {
        return new FileMetadataResponse(
                entity.getId(),
                entity.getFamilyId(),
                entity.getUserId(),
                entity.getBucketName(),
                entity.getObjectKey(),
                entity.getOriginalFileName(),
                entity.getContentType(),
                entity.getSizeBytes(),
                entity.getFileTag(),
                entity.getCreatedAt()
        );
    }

    private void ensureBucket(String bucketName) throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    private String normalizeBucket(String bucket) {
        if (bucket == null || bucket.isBlank()) {
            return "documents";
        }
        return bucket.trim().toLowerCase();
    }

    private String buildObjectKey(String originalFilename) {
        String safeName = resolveFileName(originalFilename).replaceAll("[^a-zA-Z0-9._-]", "_");
        return UUID.randomUUID() + "_" + safeName;
    }

    private String resolveFileName(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "uploaded-file";
        }
        return originalFilename.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
