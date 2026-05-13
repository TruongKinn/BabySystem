package com.mom.shopping.repository;

import com.mom.shopping.domain.ShoppingListEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ShoppingListRepository extends JpaRepository<ShoppingListEntity, Long> {

    List<ShoppingListEntity> findByFamilyIdOrderByUpdatedAtDesc(Long familyId);

    List<ShoppingListEntity> findByFamilyIdAndActiveTrueOrderByUpdatedAtDesc(Long familyId);

    @Query("select s.id from ShoppingListEntity s where s.familyId = :familyId")
    List<Long> findIdsByFamilyId(@Param("familyId") Long familyId);
}
