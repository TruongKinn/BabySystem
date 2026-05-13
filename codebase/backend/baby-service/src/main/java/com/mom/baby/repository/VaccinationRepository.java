package com.mom.baby.repository;

import com.mom.baby.domain.VaccinationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VaccinationRepository extends JpaRepository<VaccinationEntity, Long> {

    List<VaccinationEntity> findByBabyIdOrderByDueDateAsc(Long babyId);

    Optional<VaccinationEntity> findFirstByBabyIdAndCompletedFalseAndDueDateGreaterThanEqualOrderByDueDateAsc(Long babyId, LocalDate date);
}
