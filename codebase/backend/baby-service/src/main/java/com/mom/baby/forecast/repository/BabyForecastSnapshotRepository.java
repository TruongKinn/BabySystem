package com.mom.baby.forecast.repository;

import com.mom.baby.forecast.domain.BabyForecastSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface BabyForecastSnapshotRepository extends JpaRepository<BabyForecastSnapshotEntity, Long> {

    Optional<BabyForecastSnapshotEntity> findFirstByBabyIdOrderByGeneratedAtDesc(Long babyId);

    List<BabyForecastSnapshotEntity> findByBabyIdAndGeneratedAtBetweenOrderByGeneratedAtDesc(
            Long babyId,
            OffsetDateTime from,
            OffsetDateTime to
    );
}
