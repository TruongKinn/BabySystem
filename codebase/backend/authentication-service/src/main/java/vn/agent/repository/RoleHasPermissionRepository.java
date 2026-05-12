package vn.agent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.agent.model.RoleHasPermission;

import java.util.Collection;
import java.util.List;

public interface RoleHasPermissionRepository extends JpaRepository<RoleHasPermission, Long> {

    List<RoleHasPermission> findAllByRole_Id(Long roleId);

    List<RoleHasPermission> findAllByRole_IdIn(Collection<Long> roleIds);

    void deleteAllByRole_Id(Long roleId);

    void deleteAllByPermission_Id(Long permissionId);
}
