package com.mom.account.repository;

import com.mom.account.domain.FamilyEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FamilyRepository extends JpaRepository<FamilyEntity, Long> {

    List<FamilyEntity> findAllByOrderByCreatedAtDesc();

    @Query("SELECT f FROM FamilyEntity f WHERE " +
           "(:searchText IS NULL OR :searchText = '' OR " +
           " LOWER(f.name) LIKE LOWER(CONCAT('%', :searchText, '%')))" +
           " ORDER BY f.createdAt DESC")
    Page<FamilyEntity> searchFamilies(
            @Param("searchText") String searchText,
            Pageable pageable);
}
