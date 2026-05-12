package vn.agent.service;

import org.springframework.security.core.GrantedAuthority;
import vn.agent.common.TokenType;

import java.util.Collection;

public interface JwtService {

    String generateToken(Long userId, String username, String firstName, String lastName,
            Collection<? extends GrantedAuthority> authorities);

    String generateRefreshToken(Long userId, String username, String firstName, String lastName,
            Collection<? extends GrantedAuthority> authorities);

    String extractUsername(String token, TokenType type);

    Long extractUserId(String token, TokenType type);
}
