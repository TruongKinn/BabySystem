package com.mom.file.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.file.controller.dto.FileDownloadUrlResponse;
import com.mom.file.controller.dto.FileMetadataResponse;
import com.mom.file.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import java.io.InputStream;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping(value = "/files/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileMetadataResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "bucket", required = false) String bucket,
            @RequestParam(value = "tag", required = false) String tag
    ) {
        return ApiResponse.ok("File uploaded", fileService.upload(file, familyId, userId, bucket, tag));
    }

    @GetMapping("/files")
    public ApiResponse<List<FileMetadataResponse>> getFiles(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "bucket", required = false) String bucket,
            @RequestParam(value = "tag", required = false) String tag
    ) {
        return ApiResponse.ok("Success", fileService.getFiles(familyId, bucket, tag));
    }

    @GetMapping("/files/{id}")
    public ApiResponse<FileMetadataResponse> getFile(@PathVariable("id") Long fileId) {
        return ApiResponse.ok("Success", fileService.getFile(fileId));
    }

    @GetMapping("/files/{id}/download-url")
    public ApiResponse<FileDownloadUrlResponse> getDownloadUrl(
            @PathVariable("id") Long fileId,
            @RequestParam(value = "expirySeconds", required = false, defaultValue = "900") int expirySeconds,
            @RequestParam(value = "disposition", required = false) String disposition
    ) {
        return ApiResponse.ok("Success", fileService.getDownloadUrl(fileId, expirySeconds, disposition));
    }

    @PostMapping("/files/{id}/tag")
    public ApiResponse<FileMetadataResponse> updateTag(
            @PathVariable("id") Long fileId,
            @RequestParam("tag") String tag
    ) {
        return ApiResponse.ok("File tag updated", fileService.updateTag(fileId, tag));
    }

    @DeleteMapping("/files/{id}")
    public ApiResponse<Object> deleteFile(
            @PathVariable("id") Long fileId,
            @RequestParam(value = "deleteObject", required = false, defaultValue = "false") boolean deleteObject
    ) {
        fileService.deleteFile(fileId, deleteObject);
        return ApiResponse.ok("File deleted", null);
    }

    @GetMapping("/files/{id}/view")
    public ResponseEntity<InputStreamResource> viewFileContent(@PathVariable("id") Long fileId) {
        FileMetadataResponse metadata = fileService.getFile(fileId);
        InputStream stream = fileService.getFileStream(fileId);
        
        HttpHeaders headers = new HttpHeaders();
        
        // Sử dụng Spring ContentDisposition để encode tên file Unicode an toàn, tránh crash HTTP header do tiếng Việt có dấu
        org.springframework.http.ContentDisposition contentDisposition = org.springframework.http.ContentDisposition.inline()
                .filename(metadata.originalFileName(), java.nio.charset.StandardCharsets.UTF_8)
                .build();
        headers.setContentDisposition(contentDisposition);
        
        // Cho phép embed trong iframe từ bất kỳ origin nào (thay thế X-Frame-Options: ALLOWALL không hợp lệ)
        headers.add("Content-Security-Policy", "frame-ancestors *");
        
        // Tự động dò tìm Content-Type chính xác dựa vào đuôi file nếu bị trống hoặc là generic octet-stream
        String contentType = metadata.contentType();
        if (contentType == null || contentType.isBlank() || "application/octet-stream".equalsIgnoreCase(contentType)) {
            String fileName = metadata.originalFileName().toLowerCase();
            if (fileName.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (fileName.endsWith(".png")) {
                contentType = "image/png";
            } else if (fileName.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (fileName.endsWith(".svg")) {
                contentType = "image/svg+xml";
            } else if (fileName.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (fileName.endsWith(".txt")) {
                contentType = "text/plain";
            } else if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
                contentType = "text/html";
            }
        }
        
        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(metadata.sizeBytes())
                .contentType(MediaType.parseMediaType(contentType))
                .body(new InputStreamResource(stream));
    }
}

