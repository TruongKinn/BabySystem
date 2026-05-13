package com.mom.baby.repository;

import com.mom.baby.domain.BabyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BabyRepository extends JpaRepository<BabyEntity, Long> {

    List<BabyEntity> findByFamilyIdOrderByCreatedAtDesc(Long familyId);
}
