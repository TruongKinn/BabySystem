package vn.agent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.agent.common.PermissionType;
import vn.agent.model.Permission;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByNameIgnoreCase(String name);

    List<Permission> findAllByType(PermissionType type);
}

