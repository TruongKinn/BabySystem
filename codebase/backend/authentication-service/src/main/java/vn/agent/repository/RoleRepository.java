package vn.agent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.agent.model.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Role findByName(String name);

    boolean existsByNameIgnoreCase(String name);
}
