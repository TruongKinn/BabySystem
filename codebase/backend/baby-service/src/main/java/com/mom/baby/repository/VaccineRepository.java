package com.mom.baby.repository;

import com.mom.baby.domain.VaccineEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VaccineRepository extends JpaRepository<VaccineEntity, Long> {
    Optional<VaccineEntity> findByName(String name);
    List<VaccineEntity> findByIsActiveTrueOrderByNameAsc();
}
