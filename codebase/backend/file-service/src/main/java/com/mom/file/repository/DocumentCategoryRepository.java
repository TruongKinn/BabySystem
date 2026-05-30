package com.mom.file.repository;

import com.mom.file.domain.DocumentCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DocumentCategoryRepository extends JpaRepository<DocumentCategoryEntity, Long> {

    @Query("SELECT d FROM DocumentCategoryEntity d WHERE d.familyId IS NULL OR d.familyId = :familyId ORDER BY d.id ASC")
    List<DocumentCategoryEntity> findAllByFamilyIdOrSystem(@Param("familyId") Long familyId);

    boolean existsByFamilyIdAndNameIgnoreCase(Long familyId, String name);
    
    boolean existsByFamilyIdIsNullAndNameIgnoreCase(String name);
}
