package com.mom.account.repository;

import com.mom.account.domain.FamilyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyRepository extends JpaRepository<FamilyEntity, Long> {
}
