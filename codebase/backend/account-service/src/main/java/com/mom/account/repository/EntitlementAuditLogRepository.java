package com.mom.account.repository;

import com.mom.account.domain.EntitlementAuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EntitlementAuditLogRepository extends JpaRepository<EntitlementAuditLogEntity, Long> {
    List<EntitlementAuditLogEntity> findByFamilyIdOrderByChangedAtDesc(Long familyId);
}
