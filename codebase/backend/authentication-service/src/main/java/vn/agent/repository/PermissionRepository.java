package vn.agent.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.agent.common.PermissionType;
import vn.agent.model.Permission;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByNameIgnoreCase(String name);

    List<Permission> findAllByType(PermissionType type);

    @Query("SELECT p FROM Permission p WHERE " +
           "(:type IS NULL OR p.type = :type) AND " +
           "(:searchText IS NULL OR :searchText = '' OR " +
           " LOWER(p.name) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           " LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           " LOWER(COALESCE(p.menuKey, '')) LIKE LOWER(CONCAT('%', :searchText, '%')) OR " +
           " LOWER(COALESCE(p.apiPath, '')) LIKE LOWER(CONCAT('%', :searchText, '%')))")
    Page<Permission> searchPermissions(
            @Param("searchText") String searchText,
            @Param("type") PermissionType type,
            Pageable pageable);
}

