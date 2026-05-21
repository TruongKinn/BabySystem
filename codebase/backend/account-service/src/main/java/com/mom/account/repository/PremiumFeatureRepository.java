package com.mom.account.repository;

import com.mom.account.domain.PremiumFeatureEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PremiumFeatureRepository extends JpaRepository<PremiumFeatureEntity, String> {
    List<PremiumFeatureEntity> findAllByOrderByKeyAsc();
}
