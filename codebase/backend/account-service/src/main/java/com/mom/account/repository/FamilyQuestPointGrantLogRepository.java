package com.mom.account.repository;

import com.mom.account.domain.FamilyQuestPointGrantLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FamilyQuestPointGrantLogRepository extends JpaRepository<FamilyQuestPointGrantLogEntity, Long> {

    List<FamilyQuestPointGrantLogEntity> findTop30ByFamilyIdOrderByGrantedAtDesc(Long familyId);
}
