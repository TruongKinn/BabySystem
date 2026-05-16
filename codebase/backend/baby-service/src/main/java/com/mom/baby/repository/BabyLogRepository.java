package com.mom.baby.repository;

import com.mom.baby.domain.BabyLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface BabyLogRepository extends JpaRepository<BabyLogEntity, Long> {

    List<BabyLogEntity> findByBabyIdOrderByLoggedAtDesc(Long babyId);

    List<BabyLogEntity> findByBabyIdAndLoggedAtBetweenOrderByLoggedAtDesc(Long babyId, OffsetDateTime from, OffsetDateTime to);
}
