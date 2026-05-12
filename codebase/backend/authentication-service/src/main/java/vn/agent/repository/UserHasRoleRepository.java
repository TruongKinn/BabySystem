package vn.agent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.agent.model.UserHasRole;

import java.util.List;

public interface UserHasRoleRepository extends JpaRepository<UserHasRole, Long> {

    List<UserHasRole> findAllByUserId(Long userId);

    void deleteAllByRole_Id(Long roleId);
}
