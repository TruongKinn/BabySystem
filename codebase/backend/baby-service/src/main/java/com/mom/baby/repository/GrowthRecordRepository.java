package com.mom.baby.repository;

import com.mom.baby.domain.GrowthRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GrowthRecordRepository extends JpaRepository<GrowthRecordEntity, Long> {

    List<GrowthRecordEntity> findByBabyIdOrderByMeasuredAtDesc(Long babyId);

    Optional<GrowthRecordEntity> findFirstByBabyIdAndMeasuredAtLessThanEqualOrderByMeasuredAtDesc(Long babyId, LocalDate measuredAt);
}
