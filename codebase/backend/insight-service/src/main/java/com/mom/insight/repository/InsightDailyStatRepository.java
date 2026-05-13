package com.mom.insight.repository;

import com.mom.insight.domain.InsightDailyStatEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InsightDailyStatRepository extends JpaRepository<InsightDailyStatEntity, Long> {

    Optional<InsightDailyStatEntity> findByFamilyIdAndStatDate(Long familyId, LocalDate statDate);

    List<InsightDailyStatEntity> findByFamilyIdAndStatDateBetweenOrderByStatDateAsc(Long familyId, LocalDate from, LocalDate to);
}
