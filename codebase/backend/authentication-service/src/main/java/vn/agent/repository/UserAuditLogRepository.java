package vn.agent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.agent.model.UserAuditLog;

public interface UserAuditLogRepository extends JpaRepository<UserAuditLog, Long> {
}
