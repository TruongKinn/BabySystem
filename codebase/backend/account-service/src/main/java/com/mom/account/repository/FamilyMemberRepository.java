package com.mom.account.repository;

import com.mom.account.domain.FamilyMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FamilyMemberRepository extends JpaRepository<FamilyMemberEntity, Long> {
    List<FamilyMemberEntity> findByFamilyId(Long familyId);
    List<FamilyMemberEntity> findByUserId(Long userId);
    void deleteAllByFamilyId(Long familyId);
}
