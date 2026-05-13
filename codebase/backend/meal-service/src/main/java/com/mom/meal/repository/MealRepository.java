package com.mom.meal.repository;

import com.mom.meal.domain.MealEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MealRepository extends JpaRepository<MealEntity, Long> {

    boolean existsByFamilyIdAndNameIgnoreCase(Long familyId, String name);

    boolean existsByFamilyIdAndNameIgnoreCaseAndIdNot(Long familyId, String name, Long id);

    List<MealEntity> findByFamilyIdOrderByNameAsc(Long familyId);
}
