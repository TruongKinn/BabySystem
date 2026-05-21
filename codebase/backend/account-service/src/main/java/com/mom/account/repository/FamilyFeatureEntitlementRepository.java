package com.mom.account.repository;

import com.mom.account.domain.FamilyFeatureEntitlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyFeatureEntitlementRepository extends JpaRepository<FamilyFeatureEntitlementEntity, Long> {
    List<FamilyFeatureEntitlementEntity> findByFamilyId(Long familyId);

    Optional<FamilyFeatureEntitlementEntity> findByFamilyIdAndFeatureKey(Long familyId, String featureKey);
}
