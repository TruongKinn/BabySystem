package com.mom.baby.repository;

import com.mom.baby.domain.VaccineScheduleConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VaccineScheduleConfigRepository extends JpaRepository<VaccineScheduleConfigEntity, Long> {
    List<VaccineScheduleConfigEntity> findByVaccineIdOrderByDoseNumberAsc(Long vaccineId);
    Optional<VaccineScheduleConfigEntity> findByVaccineIdAndDoseNumber(Long vaccineId, int doseNumber);
}
