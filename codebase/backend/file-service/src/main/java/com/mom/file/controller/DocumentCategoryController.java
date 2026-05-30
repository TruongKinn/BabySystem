package com.mom.file.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.file.controller.dto.CreateDocumentCategoryRequest;
import com.mom.file.controller.dto.DocumentCategoryResponse;
import com.mom.file.service.DocumentCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DocumentCategoryController {

    private final DocumentCategoryService service;

    @GetMapping("/document-categories")
    public ApiResponse<List<DocumentCategoryResponse>> getCategories(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", service.getCategories(familyId));
    }

    @PostMapping("/document-categories")
    public ApiResponse<DocumentCategoryResponse> createCategory(@RequestBody CreateDocumentCategoryRequest request) {
        return ApiResponse.ok("Document category created", service.createCategory(request));
    }
}
