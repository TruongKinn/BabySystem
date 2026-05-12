package vn.agent.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.agent.model.User;

import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    User findByUsername(String userName);

    List<User> findAllByUsernameIgnoreCase(String username);

    List<User> findAllByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);

    List<User> findAllByEmailIgnoreCase(String email);
}
