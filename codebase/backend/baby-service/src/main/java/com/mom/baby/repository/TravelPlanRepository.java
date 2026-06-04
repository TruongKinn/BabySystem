package com.mom.baby.repository;

import com.mom.baby.domain.TravelPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TravelPlanRepository extends JpaRepository<TravelPlanEntity, String> {

    List<TravelPlanEntity> findByFamilyIdOrderByStartDateAsc(Long familyId);
}
