package com.mom.file.controller.dto;

import java.time.OffsetDateTime;

public record FileMetadataResponse(
        Long id,
        Long familyId,
        Long userId,
        String bucketName,
        String objectKey,
        String originalFileName,
        String contentType,
        long sizeBytes,
        String fileTag,
        OffsetDateTime createdAt
) {
}
