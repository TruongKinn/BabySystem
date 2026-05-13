package com.mom.meal.repository;

import com.mom.meal.domain.MealPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MealPlanRepository extends JpaRepository<MealPlanEntity, Long> {

    List<MealPlanEntity> findByFamilyIdOrderByPlanDateDescCreatedAtDesc(Long familyId);

    List<MealPlanEntity> findByFamilyIdAndPlanDateOrderByCreatedAtDesc(Long familyId, LocalDate planDate);

    List<MealPlanEntity> findByFamilyIdAndPlanDateBetweenOrderByPlanDateAscCreatedAtDesc(
            Long familyId,
            LocalDate from,
            LocalDate to
    );

    boolean existsByFamilyIdAndMealIdAndPlanDate(Long familyId, Long mealId, LocalDate planDate);

    boolean existsByFamilyIdAndMealIdAndPlanDateAndIdNot(Long familyId, Long mealId, LocalDate planDate, Long id);

    boolean existsByMealId(Long mealId);
}
