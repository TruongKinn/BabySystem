package com.mom.file.controller.dto;

public record FileDownloadUrlResponse(
        Long fileId,
        String downloadUrl,
        int expirySeconds
) {
}
