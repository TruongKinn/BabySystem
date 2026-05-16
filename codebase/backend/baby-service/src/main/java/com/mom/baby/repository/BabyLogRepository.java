package com.mom.baby.repository;

import com.mom.baby.domain.BabyLogEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface BabyLogRepository extends JpaRepository<BabyLogEntity, Long> {

    List<BabyLogEntity> findByBabyIdOrderByLoggedAtDesc(Long babyId);

    List<BabyLogEntity> findByBabyIdOrderByLoggedAtDesc(Long babyId, Pageable pageable);

    List<BabyLogEntity> findByBabyIdAndLoggedAtBetweenOrderByLoggedAtDesc(Long babyId, OffsetDateTime from, OffsetDateTime to);

    List<BabyLogEntity> findByBabyIdAndLoggedAtBetweenOrderByLoggedAtAsc(Long babyId, OffsetDateTime from, OffsetDateTime to);

    Optional<BabyLogEntity> findFirstByBabyIdOrderByLoggedAtDesc(Long babyId);
}
