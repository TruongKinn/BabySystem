package com.mom.insight.repository;

import com.mom.insight.domain.InsightExportFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InsightExportFileRepository extends JpaRepository<InsightExportFileEntity, Long>, JpaSpecificationExecutor<InsightExportFileEntity> {
}
