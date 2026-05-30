package com.mom.file.service;

import com.mom.common.security.DataIsolationUtil;
import com.mom.file.controller.dto.CreateDocumentCategoryRequest;
import com.mom.file.controller.dto.DocumentCategoryResponse;
import com.mom.file.domain.DocumentCategoryEntity;
import com.mom.file.repository.DocumentCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentCategoryService {

    private final DocumentCategoryRepository repository;

    public List<DocumentCategoryResponse> getCategories(Long familyId) {
        if (familyId == null) {
            throw new IllegalArgumentException("familyId is required");
        }
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        return repository.findAllByFamilyIdOrSystem(familyId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public DocumentCategoryResponse createCategory(CreateDocumentCategoryRequest request) {
        if (request.familyId() == null) {
            throw new IllegalArgumentException("familyId is required");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        DataIsolationUtil.validateFamilyAccess(request.familyId());

        // Kiểm tra xem tên phân loại đã tồn tại chưa (trong hệ thống hoặc của gia đình)
        boolean exists = repository.existsByFamilyIdAndNameIgnoreCase(request.familyId(), request.name()) 
                || repository.existsByFamilyIdIsNullAndNameIgnoreCase(request.name());
        if (exists) {
            throw new IllegalArgumentException("Document category with name '" + request.name() + "' already exists");
        }

        DocumentCategoryEntity entity = new DocumentCategoryEntity();
        entity.setFamilyId(request.familyId());
        entity.setName(request.name().trim());
        entity.setIcon(request.icon() != null ? request.icon().trim() : "file");
        entity.setColor(request.color() != null ? request.color().trim() : "#6b7280");

        return toResponse(repository.save(entity));
    }

    private DocumentCategoryResponse toResponse(DocumentCategoryEntity entity) {
        return new DocumentCategoryResponse(
                entity.getId(),
                entity.getFamilyId(),
                entity.getName(),
                entity.getIcon(),
                entity.getColor(),
                entity.getCreatedAt()
        );
    }
}
