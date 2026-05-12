package vn.agent.service.impl;

import static vn.agent.common.TokenType.REFRESH_TOKEN;

import java.util.List;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.Comparator;

import org.apache.commons.lang3.StringUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.http.HttpServletRequest;
import vn.agent.controller.request.ForceChangePasswordRequest;
import lombok.RequiredArgsConstructor;
import vn.agent.controller.request.LoginRequest;
import vn.agent.controller.response.TokenResponse;
import vn.agent.common.UserStatus;
import vn.agent.common.UserType;
import vn.agent.model.User;
import vn.agent.model.Role;
import vn.agent.model.UserHasRole;
import vn.agent.exception.InvalidDataException;
import vn.agent.exception.UnauthorizedException;
import vn.agent.model.RedisToken;
import vn.agent.repository.RoleRepository;
import vn.agent.repository.UserHasRoleRepository;
import vn.agent.repository.TokenRepository;
import vn.agent.repository.UserRepository;
import vn.agent.service.AuthenticationService;
import vn.agent.service.JwtService;
import vn.agent.client.KeycloakUserInfoClient;

@Service
@RequiredArgsConstructor
public class AuthenticationServiceImp implements AuthenticationService {

    private final TokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserHasRoleRepository userHasRoleRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;
    private final vn.agent.service.CaptchaService captchaService;
    private final KeycloakUserInfoClient keycloakUserInfoClient;

    @org.springframework.beans.factory.annotation.Value("${spring.keycloak.url}")
    private String keycloakUrl;

    @Override
    public TokenResponse createAccessToken(LoginRequest request) {
        String username = request.getUsername();
        String loginFailKey = "login:fail:" + username;

        String failCountStr = stringRedisTemplate.opsForValue().get(loginFailKey);
        int fails = failCountStr != null ? Integer.parseInt(failCountStr) : 0;

        if (fails >= 3) {
            if (org.apache.commons.lang3.StringUtils.isBlank(request.getCaptchaToken()) ||
                    org.apache.commons.lang3.StringUtils.isBlank(request.getCaptchaAnswer())) {
                throw new vn.agent.exception.UnauthorizedException("REQUIRES_CAPTCHA");
            }
            captchaService.verifyCaptcha(request.getCaptchaToken(), request.getCaptchaAnswer());
        }

        User user = resolveUserForBearerLogin(username);

        if (user == null) {
            handleLoginFail(loginFailKey, fails);
            throw new vn.agent.exception.UnauthorizedException("Bad credentials");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            handleLoginFail(loginFailKey, fails);
            throw new vn.agent.exception.UnauthorizedException("Bad credentials");
        }

        assertUserCanAuthenticate(user);
        if (user.isRequirePasswordChange()) {
            throw new UnauthorizedException("PASSWORD_CHANGE_REQUIRED");
        }

        // Login success, clear fails
        stringRedisTemplate.delete(loginFailKey);

        // Check if 2FA is enabled
        if (user.isTwoFactorEnabled()) {
            if (request.getOtp() == null || request.getOtp().isBlank()) {
                throw new UnauthorizedException("OTP is required for this account");
            }

            // Verify OTP
            TimeProvider timeProvider = new SystemTimeProvider();
            CodeGenerator codeGenerator = new DefaultCodeGenerator();
            DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
            verifier.setAllowedTimePeriodDiscrepancy(1); // Allow 1 time period (30s) drift
            String secret = user.getSecret().trim().toUpperCase();
            boolean isValidOtp = verifier.isValidCode(secret, request.getOtp());
            if (!isValidOtp) {
                throw new UnauthorizedException("Invalid OTP code");
            }
        }

        // generate access token
        String accessToken = jwtService.generateToken(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), user.getAuthorities());

        // generate refresh token
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), user.getAuthorities());

        List<String> roleList = user.getRoles().stream().map(role -> role.getRole().getName()).toList();

        // save token with difference versions (WEB, MOBILE, MiniApp) to DB
        tokenRepository.save(RedisToken.builder()
                .id(request.getUsername())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .flatForm(request.getPlatform().getValue())
                .deviceToken(request.getDeviceToken())
                .roles(roleList.toString())
                .build());

        // TODO how to manage token for multiple devices
        // TODO how to manage authorization for APIs

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(resolveAvatarUrl(user))
                .build();
    }

    private User resolveUserForBearerLogin(String username) {
        List<User> candidates = userRepository.findAllByUsernameIgnoreCase(username);
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
                .filter(user -> Boolean.TRUE.equals(user.isTwoFactorEnabled()))
                .findFirst()
                .or(() -> candidates.stream()
                        .filter(user -> StringUtils.equalsIgnoreCase(user.getUsername(), username))
                        .findFirst())
                .or(() -> candidates.stream()
                        .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                        .findFirst())
                .or(() -> candidates.stream()
                        .min(Comparator.comparing(User::getId)))
                .orElse(null);
    }

    @Override
    public TokenResponse createRefreshToken(HttpServletRequest request) {
        final String refreshToken = request.getHeader("x-refresh-token");

        if (StringUtils.isBlank(refreshToken)) {
            throw new UnauthorizedException("Token must be not blank");
        }

        final String userName;
        try {
            userName = jwtService.extractUsername(refreshToken, REFRESH_TOKEN);
        } catch (ExpiredJwtException | SignatureException e) {
            throw new UnauthorizedException(e.getMessage());
        }

        User user = resolveUserForBearerLogin(userName);
        if (user == null) {
            throw new UnauthorizedException("Not allow access with this token");
        }
        assertUserCanAuthenticate(user);

        // generate access token
        String accessToken = jwtService.generateToken(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), user.getAuthorities());

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(resolveAvatarUrl(user))
                .build();
    }

    @Override
    @Transactional
    public TokenResponse exchangeKeycloakToken(vn.agent.controller.request.KeycloakExchangeRequest request) {
        java.util.Map<String, Object> userInfo = keycloakUserInfoClient.fetchUserInfo(request.getKeycloakToken());

        if (userInfo == null) {
            throw new UnauthorizedException("Invalid Keycloak token");
        }

        // Extract username from Keycloak userinfo
        String username = (String) userInfo.get("preferred_username");
        if (username == null) {
            username = (String) userInfo.get("email");
        }

        if (username == null) {
            throw new UnauthorizedException("Cannot extract username from Keycloak token");
        }

        User user = resolveOrCreateLocalUser(userInfo, username);
        assertUserCanAuthenticate(user);
        if (user.isRequirePasswordChange()) {
            throw new UnauthorizedException("PASSWORD_CHANGE_REQUIRED");
        }

        // Generate internal tokens
        String accessToken = jwtService.generateToken(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), user.getAuthorities());

        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getUsername(), user.getFirstName(),
                user.getLastName(), user.getAuthorities());

        List<String> roleList = user.getRoles().stream().map(role -> role.getRole().getName()).toList();

        // Save token to Redis
        tokenRepository.save(vn.agent.model.RedisToken.builder()
                .id(request.getKeycloakToken().substring(0, Math.min(50, request.getKeycloakToken().length())))
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .flatForm(request.getPlatform())
                .deviceToken(request.getDeviceToken())
                .roles(roleList.toString())
                .build());

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(resolveAvatarUrl(user))
                .build();
    }

    @Override
    @Transactional
    public void forceChangePassword(ForceChangePasswordRequest request) {
        User user = resolveUserForBearerLogin(request.getUsername());
        if (user == null) {
            throw new UnauthorizedException("Bad credentials");
        }

        assertUserCanAuthenticate(user);

        if (!user.isRequirePasswordChange()) {
            throw new InvalidDataException("Password change is not required");
        }

        if (!passwordEncoder.matches(request.getTemporaryPassword(), user.getPassword())) {
            throw new UnauthorizedException("Bad credentials");
        }

        String newPassword = request.getNewPassword();
        if (StringUtils.isBlank(newPassword) || newPassword.length() < 6) {
            throw new InvalidDataException("New password must be at least 6 characters");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new InvalidDataException("New password must be different from temporary password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setRequirePasswordChange(false);
        userRepository.save(user);
    }

    private User resolveOrCreateLocalUser(Map<String, Object> userInfo, String username) {
        String email = stringValue(userInfo.get("email"));
        String firstName = stringValue(userInfo.get("given_name"));
        String lastName = stringValue(userInfo.get("family_name"));
        String preferredUsername = StringUtils.defaultIfBlank(username, email);

        List<User> candidates = userRepository.findAllByUsernameIgnoreCaseOrEmailIgnoreCase(preferredUsername, email);
        if ((candidates == null || candidates.isEmpty()) && StringUtils.isNotBlank(email)) {
            candidates = userRepository.findAllByEmailIgnoreCase(email);
        }

        User user = selectBestUserCandidate(candidates, preferredUsername, email);

        if (user != null) {
            boolean changed = false;
            if (StringUtils.isBlank(user.getEmail()) && StringUtils.isNotBlank(email)) {
                user.setEmail(email);
                changed = true;
            }
            if (StringUtils.isBlank(user.getFirstName()) && StringUtils.isNotBlank(firstName)) {
                user.setFirstName(firstName);
                changed = true;
            }
            if (StringUtils.isBlank(user.getLastName()) && StringUtils.isNotBlank(lastName)) {
                user.setLastName(lastName);
                changed = true;
            }
            if (user.getStatus() == null) {
                user.setStatus(UserStatus.ACTIVE);
                changed = true;
            }
            if (user.getType() == null) {
                user.setType(UserType.USER);
                changed = true;
            }
            if (changed) {
                user = userRepository.save(user);
            }
            ensureDefaultRole(user);
            return user;
        }

        User newUser = User.builder()
                .username(preferredUsername)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .type(UserType.USER)
                .status(UserStatus.ACTIVE)
                .isTwoFactorEnabled(false)
                .roles(new HashSet<>())
                .build();

        user = userRepository.save(newUser);
        ensureDefaultRole(user);
        return user;
    }

    private User selectBestUserCandidate(List<User> candidates, String username, String email) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        return candidates.stream()
                .filter(user -> StringUtils.equalsIgnoreCase(user.getUsername(), username))
                .findFirst()
                .or(() -> candidates.stream()
                        .filter(user -> StringUtils.isNotBlank(email)
                                && StringUtils.equalsIgnoreCase(user.getEmail(), email))
                        .findFirst())
                .or(() -> candidates.stream()
                        .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                        .findFirst())
                .or(() -> candidates.stream()
                        .min(Comparator.comparing(User::getId)))
                .orElse(null);
    }

    private void ensureDefaultRole(User user) {
        Role defaultRole = roleRepository.findByName("USER");
        if (defaultRole == null) {
            defaultRole = new Role();
            defaultRole.setName("USER");
            defaultRole = roleRepository.save(defaultRole);
        }

        Set<UserHasRole> existingRoles = user.getRoles();
        boolean alreadyHasUserRole = existingRoles != null && existingRoles.stream()
                .anyMatch(userHasRole -> userHasRole.getRole() != null
                        && "USER".equalsIgnoreCase(userHasRole.getRole().getName()));
        if (alreadyHasUserRole) {
            return;
        }

        UserHasRole userHasRole = new UserHasRole();
        userHasRole.setUser(user);
        userHasRole.setRole(defaultRole);
        userHasRoleRepository.save(userHasRole);
        user.getRoles().add(userHasRole);
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }

    private void handleLoginFail(String loginFailKey, int currentFails) {
        currentFails++;
        stringRedisTemplate.opsForValue().set(loginFailKey, String.valueOf(currentFails),
                java.time.Duration.ofMinutes(15));
    }

    private void assertUserCanAuthenticate(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Account is locked or inactive");
        }
    }

    private String resolveAvatarUrl(User user) {
        return user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()
                ? null
                : "/account/user/avatar/" + user.getId();
    }
}
