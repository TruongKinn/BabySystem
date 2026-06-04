package com.mom.baby.forecast.repository;

import com.mom.baby.forecast.domain.BabyForecastAnomalyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BabyForecastAnomalyRepository extends JpaRepository<BabyForecastAnomalyEntity, Long> {

    List<BabyForecastAnomalyEntity> findByBabyIdOrderByDetectedAtDesc(Long babyId);

    List<BabyForecastAnomalyEntity> findByBabyIdAndResolvedAtIsNullOrderByDetectedAtDesc(Long babyId);
}
