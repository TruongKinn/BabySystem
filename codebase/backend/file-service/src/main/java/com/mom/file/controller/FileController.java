package com.mom.file.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.file.controller.dto.FileDownloadUrlResponse;
import com.mom.file.controller.dto.FileMetadataResponse;
import com.mom.file.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
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

    @DeleteMapping("/files/{id}")
    public ApiResponse<Object> deleteFile(
            @PathVariable("id") Long fileId,
            @RequestParam(value = "deleteObject", required = false, defaultValue = "false") boolean deleteObject
    ) {
        fileService.deleteFile(fileId, deleteObject);
        return ApiResponse.ok("File deleted", null);
    }
}
