package com.mom.baby.repository;

import com.mom.baby.domain.JourneyEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JourneyEventRepository extends JpaRepository<JourneyEventEntity, String> {

    List<JourneyEventEntity> findByBabyIdOrderByHappenedAtDesc(Long babyId);

    boolean existsByIdAndBabyId(String id, Long babyId);
}
