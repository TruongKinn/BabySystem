package com.mom.baby.repository;

import com.mom.baby.domain.VaccinationEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VaccinationRepository extends JpaRepository<VaccinationEntity, Long> {

    List<VaccinationEntity> findByBabyIdOrderByDueDateAsc(Long babyId);

    List<VaccinationEntity> findByBabyIdAndCompletedFalseOrderByDueDateAsc(Long babyId, Pageable pageable);

    Optional<VaccinationEntity> findFirstByBabyIdAndCompletedFalseAndDueDateGreaterThanEqualOrderByDueDateAsc(Long babyId, LocalDate date);

    long countByBabyIdAndCompletedFalseAndDueDateGreaterThanEqual(Long babyId, LocalDate date);

    long countByBabyIdAndCompletedFalseAndDueDateLessThan(Long babyId, LocalDate date);
}
