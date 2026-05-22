package com.mom.account.repository;

import com.mom.account.domain.FamilyQuestRewardRedemptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FamilyQuestRewardRedemptionRepository extends JpaRepository<FamilyQuestRewardRedemptionEntity, Long> {

    List<FamilyQuestRewardRedemptionEntity> findTop20ByFamilyIdOrderByRedeemedAtDesc(Long familyId);
}
