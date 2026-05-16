package com.mom.account.repository;

import com.mom.account.domain.FamilyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FamilyRepository extends JpaRepository<FamilyEntity, Long> {

    List<FamilyEntity> findAllByOrderByCreatedAtDesc();
}
