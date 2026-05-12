package vn.agent.service.impl;

import org.apache.commons.lang3.StringUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import vn.agent.common.UserStatus;
import vn.agent.model.User;
import vn.agent.repository.UserRepository;
import vn.agent.service.UserService;

import java.util.Comparator;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserDetailsService userDetailsService() {
        return username -> resolveUserByUsername(username);
    }

    private UserDetails resolveUserByUsername(String username) {
        var candidates = userRepository.findAllByUsernameIgnoreCase(username);
        if (candidates == null || candidates.isEmpty()) {
            throw new org.springframework.security.core.userdetails.UsernameNotFoundException("User not found");
        }

        User user = candidates.stream()
                .filter(item -> StringUtils.equalsIgnoreCase(item.getUsername(), username))
                .findFirst()
                .or(() -> candidates.stream()
                        .filter(item -> item.getStatus() == UserStatus.ACTIVE)
                        .findFirst())
                .or(() -> candidates.stream()
                        .min(Comparator.comparing(User::getId)))
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(
                        "User not found"));

        if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
            throw new org.springframework.security.core.userdetails.UsernameNotFoundException("User is not active");
        }

        return user;
    }
}
