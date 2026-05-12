package vn.agent.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import vn.agent.model.RedisToken;

@Repository
public interface TokenRepository extends CrudRepository<RedisToken, String> {
}
