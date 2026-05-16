package vn.agent.service.impl;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.agent.common.UserStatus;
import vn.agent.common.UserType;
import vn.agent.controller.request.ChangePasswordRequest;
import vn.agent.controller.request.CreateUserRequest;
import vn.agent.controller.request.UpdateUserRequest;
import vn.agent.exception.InvalidDataException;
import vn.agent.model.Role;
import vn.agent.model.User;
import vn.agent.model.UserAuditLog;
import vn.agent.model.UserHasRole;
import vn.agent.repository.RoleRepository;
import vn.agent.repository.UserAuditLogRepository;
import vn.agent.repository.UserHasRoleRepository;
import vn.agent.repository.UserRepository;
import vn.agent.service.AccountUserWriteService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountUserWriteServiceImpl implements AccountUserWriteService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserHasRoleRepository userHasRoleRepository;
    private final UserAuditLogRepository userAuditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.keycloak.admin.client.Keycloak keycloakAdminClient;

    @org.springframework.beans.factory.annotation.Value("${app.keycloak.realm:micro-services}")
    private String keycloakRealm;

    @org.springframework.beans.factory.annotation.Value("${app.avatar.storage-path:uploads/avatars}")
    private String avatarStoragePath;

    @Override
    @Transactional
    public Long createUser(CreateUserRequest request) {
        validateUniqueForCreate(request.getUsername(), request.getEmail());

        User user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .phone(request.getPhone().trim())
                .email(request.getEmail().trim())
                .username(request.getUsername().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .type(resolvePersistedType(request.getType()))
                .status(UserStatus.ACTIVE)
                .isTwoFactorEnabled(false)
                .requirePasswordChange(false)
                .build();

        User savedUser = userRepository.save(user);
        syncRoles(savedUser, request.getType());
        createUserInKeycloak(request);
        createAuditLog("CREATE_USER", savedUser,
                "Created user with username=" + savedUser.getUsername() + ", email=" + savedUser.getEmail()
                        + ", type=" + savedUser.getType() + ", status=" + savedUser.getStatus());

        return savedUser.getId();
    }

    @Override
    @Transactional
    public void updateUser(UpdateUserRequest request) {
        User user = userRepository.findById(request.getId())
                .orElseThrow(() -> new InvalidDataException("User not found: " + request.getId()));

        validateUniqueForUpdate(user.getId(), request.getUsername(), request.getEmail());
        String before = summarizeUserState(user);

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setGender(request.getGender());
        user.setPhone(request.getPhone().trim());
        user.setEmail(request.getEmail().trim());
        user.setUsername(request.getUsername().trim());
        user.setType(resolvePersistedType(request.getType()));
        if (user.getStatus() == null) {
            user.setStatus(UserStatus.ACTIVE);
        }

        User savedUser = userRepository.save(user);
        syncRoles(savedUser, request.getType());
        createAuditLog("UPDATE_USER", savedUser,
                "Updated user fields. Before={" + before + "} After={" + summarizeUserState(savedUser) + "}");
    }

    @Override
    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found: " + userId));

        List<UserHasRole> roles = userHasRoleRepository.findAllByUserId(userId);
        if (!roles.isEmpty()) {
            userHasRoleRepository.deleteAll(roles);
        }
        userRepository.delete(user);
        createAuditLog("DELETE_USER", user, "Deleted user and removed role mappings");
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = userRepository.findById(request.getId())
                .orElseThrow(() -> new InvalidDataException("User not found: " + request.getId()));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new InvalidDataException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setRequirePasswordChange(false);
        userRepository.save(user);
        createAuditLog("CHANGE_PASSWORD", user, "User changed password");
    }

    @Override
    @Transactional
    public void updateUserStatus(Long userId, UserStatus status) {
        if (status != UserStatus.ACTIVE && status != UserStatus.LOCKED) {
            throw new InvalidDataException("Only ACTIVE or LOCKED status is supported");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found: " + userId));

        UserStatus previousStatus = user.getStatus();
        user.setStatus(status);
        userRepository.save(user);

        syncUserEnabledInKeycloak(user, status == UserStatus.ACTIVE);
        createAuditLog("UPDATE_USER_STATUS", user, "status: " + previousStatus + " -> " + status);
    }

    @Override
    @Transactional
    public void updateUserType(Long userId, UserType type) {
        if (type == null) {
            throw new InvalidDataException("User type is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found: " + userId));

        UserType previousType = resolveDisplayType(user);
        user.setType(resolvePersistedType(type));
        User savedUser = userRepository.save(user);
        syncRoles(savedUser, type);

        UserType nextType = resolveDisplayType(savedUser);
        createAuditLog("UPDATE_USER_TYPE", savedUser, "type: " + previousType + " -> " + nextType);
    }

    @Override
    @Transactional
    public void resetPasswordByAdmin(Long userId, String temporaryPassword) {
        if (StringUtils.isBlank(temporaryPassword)) {
            throw new InvalidDataException("Temporary password must be not blank");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found: " + userId));

        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setRequirePasswordChange(true);
        userRepository.save(user);

        resetPasswordInKeycloak(user, temporaryPassword);
        createAuditLog("RESET_PASSWORD_BY_ADMIN", user,
                "Set temporary password and requirePasswordChange=true");
    }

    @Override
    @Transactional
    public String uploadAvatar(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidDataException("Avatar file is required");
        }
        if (file.getContentType() == null || !file.getContentType().toLowerCase().startsWith("image/")) {
            throw new InvalidDataException("Avatar must be an image file");
        }
        if (file.getSize() > (30L * 1024 * 1024)) {
            throw new InvalidDataException("Avatar size must be <= 30MB");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found: " + userId));

        Path avatarDir = resolveAvatarDirectory();
        String extension = resolveFileExtension(file);
        String newFileName = "user-" + userId + "-" + UUID.randomUUID() + "." + extension;
        Path targetFile = avatarDir.resolve(newFileName).normalize();

        if (!targetFile.startsWith(avatarDir)) {
            throw new InvalidDataException("Invalid avatar destination path");
        }

        try {
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
            deleteExistingAvatar(avatarDir, user.getAvatarUrl());
        } catch (IOException e) {
            throw new InvalidDataException("Failed to store avatar file");
        }

        user.setAvatarUrl(newFileName);
        userRepository.save(user);
        return buildAvatarEndpoint(userId);
    }

    @Override
    public ResponseEntity<Resource> getAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found: " + userId));

        if (StringUtils.isBlank(user.getAvatarUrl())) {
            return ResponseEntity.notFound().build();
        }

        Path avatarDir = resolveAvatarDirectory();
        Path avatarFile = avatarDir.resolve(user.getAvatarUrl()).normalize();
        if (!avatarFile.startsWith(avatarDir) || !Files.exists(avatarFile)) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = resolveMediaType(avatarFile);
        Resource resource = new PathResource(avatarFile);
        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .body(resource);
    }

    private void validateUniqueForCreate(String username, String email) {
        if (!userRepository.findAllByUsernameIgnoreCase(username).isEmpty()) {
            throw new InvalidDataException("Username already exists");
        }
        if (!userRepository.findAllByEmailIgnoreCase(email).isEmpty()) {
            throw new InvalidDataException("Email already exists");
        }
    }

    private void validateUniqueForUpdate(Long userId, String username, String email) {
        boolean usernameUsedByAnotherUser = userRepository.findAllByUsernameIgnoreCase(username).stream()
                .anyMatch(item -> !item.getId().equals(userId));
        if (usernameUsedByAnotherUser) {
            throw new InvalidDataException("Username already exists");
        }

        boolean emailUsedByAnotherUser = userRepository.findAllByEmailIgnoreCase(email).stream()
                .anyMatch(item -> !item.getId().equals(userId));
        if (emailUsedByAnotherUser) {
            throw new InvalidDataException("Email already exists");
        }
    }

    private UserType resolvePersistedType(UserType requestedType) {
        if (requestedType == null) {
            return UserType.USER;
        }
        return requestedType == UserType.OWNER ? UserType.ADMIN : requestedType;
    }

    private UserType resolveDisplayType(User user) {
        if (user.getRoles() != null && user.getRoles().stream().anyMatch(item ->
                item.getRole() != null && "OWNER".equalsIgnoreCase(item.getRole().getName()))) {
            return UserType.OWNER;
        }
        if (user.getRoles() != null && user.getRoles().stream().anyMatch(item ->
                item.getRole() != null && "ADMIN".equalsIgnoreCase(item.getRole().getName()))) {
            return UserType.ADMIN;
        }
        return user.getType() == null ? UserType.USER : user.getType();
    }

    private void syncRoles(User user, UserType requestedType) {
        Set<String> desiredRoleNames = resolveRoleNames(requestedType);
        List<UserHasRole> existingMappings = new ArrayList<>(userHasRoleRepository.findAllByUserId(user.getId()));

        List<UserHasRole> mappingsToDelete = existingMappings.stream()
                .filter(mapping -> mapping.getRole() != null
                        && StringUtils.isNotBlank(mapping.getRole().getName())
                        && !desiredRoleNames.contains(mapping.getRole().getName().toUpperCase()))
                .toList();
        if (!mappingsToDelete.isEmpty()) {
            userHasRoleRepository.deleteAll(mappingsToDelete);
        }

        Set<String> existingRoleNames = existingMappings.stream()
                .map(UserHasRole::getRole)
                .filter(role -> role != null && StringUtils.isNotBlank(role.getName()))
                .map(role -> role.getName().toUpperCase())
                .collect(Collectors.toSet());

        for (String roleName : desiredRoleNames) {
            if (existingRoleNames.contains(roleName)) {
                continue;
            }

            Role role = roleRepository.findByName(roleName);
            if (role == null) {
                role = new Role();
                role.setName(roleName);
                role = roleRepository.save(role);
            }

            UserHasRole mapping = new UserHasRole();
            mapping.setUser(user);
            mapping.setRole(role);
            userHasRoleRepository.save(mapping);
        }
    }

    private Set<String> resolveRoleNames(UserType requestedType) {
        UserType normalizedType = requestedType == null ? UserType.USER : requestedType;
        Set<String> roleNames = new LinkedHashSet<>();
        roleNames.add("USER");
        if (normalizedType == UserType.ADMIN || normalizedType == UserType.OWNER) {
            roleNames.add("ADMIN");
        }
        if (normalizedType == UserType.OWNER) {
            roleNames.add("OWNER");
        }
        return roleNames;
    }

    private String buildAvatarEndpoint(Long userId) {
        return "/account/user/avatar/" + userId;
    }

    private Path resolveAvatarDirectory() {
        Path avatarDir = Path.of(avatarStoragePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(avatarDir);
        } catch (IOException e) {
            throw new InvalidDataException("Failed to prepare avatar storage");
        }
        return avatarDir;
    }

    private String resolveFileExtension(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (StringUtils.isNotBlank(originalFilename) && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if ("image/png".equals(contentType)) {
            return "png";
        }
        if ("image/gif".equals(contentType)) {
            return "gif";
        }
        if ("image/webp".equals(contentType)) {
            return "webp";
        }
        return "jpg";
    }

    private void deleteExistingAvatar(Path avatarDir, String currentAvatarFileName) throws IOException {
        if (StringUtils.isBlank(currentAvatarFileName)) {
            return;
        }

        Path oldAvatarFile = avatarDir.resolve(currentAvatarFileName).normalize();
        if (!oldAvatarFile.startsWith(avatarDir)) {
            return;
        }
        Files.deleteIfExists(oldAvatarFile);
    }

    private MediaType resolveMediaType(Path filePath) {
        try {
            String mimeType = Files.probeContentType(filePath);
            if (StringUtils.isNotBlank(mimeType)) {
                return MediaType.parseMediaType(mimeType);
            }
        } catch (IOException ignored) {
            // fallback to binary stream
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    private void createUserInKeycloak(CreateUserRequest request) {
        try {
            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setValue(request.getPassword());
            credential.setTemporary(false);

            UserRepresentation keycloakUser = new UserRepresentation();
            keycloakUser.setUsername(request.getUsername());
            keycloakUser.setFirstName(request.getFirstName());
            keycloakUser.setLastName(request.getLastName());
            keycloakUser.setEmail(request.getEmail());
            keycloakUser.setEnabled(true);
            keycloakUser.setCredentials(Collections.singletonList(credential));

            usersResource().create(keycloakUser);
        } catch (Exception ignored) {
            // Keep local flow resilient if Keycloak is unavailable.
        }
    }

    private void syncUserEnabledInKeycloak(User user, boolean enabled) {
        try {
            Optional<UserResource> keycloakUserResource = findKeycloakUser(user);
            if (keycloakUserResource.isEmpty()) {
                return;
            }

            UserRepresentation userRepresentation = keycloakUserResource.get().toRepresentation();
            userRepresentation.setEnabled(enabled);
            keycloakUserResource.get().update(userRepresentation);
        } catch (Exception ignored) {
            // Keep local flow resilient if Keycloak is unavailable.
        }
    }

    private void resetPasswordInKeycloak(User user, String temporaryPassword) {
        try {
            Optional<UserResource> keycloakUserResource = findKeycloakUser(user);
            if (keycloakUserResource.isEmpty()) {
                return;
            }

            CredentialRepresentation credential = new CredentialRepresentation();
            credential.setType(CredentialRepresentation.PASSWORD);
            credential.setTemporary(true);
            credential.setValue(temporaryPassword);
            keycloakUserResource.get().resetPassword(credential);

            UserRepresentation userRepresentation = keycloakUserResource.get().toRepresentation();
            List<String> requiredActions = userRepresentation.getRequiredActions() == null
                    ? new ArrayList<>()
                    : new ArrayList<>(userRepresentation.getRequiredActions());
            if (!requiredActions.contains("UPDATE_PASSWORD")) {
                requiredActions.add("UPDATE_PASSWORD");
                userRepresentation.setRequiredActions(requiredActions);
                keycloakUserResource.get().update(userRepresentation);
            }
        } catch (Exception ignored) {
            // Keep local flow resilient if Keycloak is unavailable.
        }
    }

    private Optional<UserResource> findKeycloakUser(User user) {
        try {
            List<UserRepresentation> users = usersResource().search(user.getUsername(), true);
            if (users == null || users.isEmpty()) {
                return Optional.empty();
            }

            Optional<UserRepresentation> matched = users.stream()
                    .filter(item -> StringUtils.equalsIgnoreCase(item.getUsername(), user.getUsername()))
                    .findFirst();
            if (matched.isEmpty()) {
                return Optional.empty();
            }
            return Optional.of(usersResource().get(matched.get().getId()));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private UsersResource usersResource() {
        return keycloakAdminClient.realm(keycloakRealm).users();
    }

    private void createAuditLog(String action, User targetUser, String summary) {
        if (targetUser == null || targetUser.getId() == null) {
            return;
        }

        UserAuditLog auditLog = new UserAuditLog();
        auditLog.setActor(resolveActor());
        auditLog.setAction(action);
        auditLog.setTargetUserId(targetUser.getId());
        auditLog.setTargetUsername(StringUtils.defaultIfBlank(targetUser.getUsername(), "UNKNOWN"));
        auditLog.setChangeSummary(summary);
        userAuditLogRepository.save(auditLog);
    }

    private String summarizeUserState(User user) {
        return "firstName=" + StringUtils.defaultString(user.getFirstName())
                + ", lastName=" + StringUtils.defaultString(user.getLastName())
                + ", email=" + StringUtils.defaultString(user.getEmail())
                + ", username=" + StringUtils.defaultString(user.getUsername())
                + ", phone=" + StringUtils.defaultString(user.getPhone())
                + ", type=" + user.getType()
                + ", status=" + user.getStatus()
                + ", requirePasswordChange=" + user.isRequirePasswordChange();
    }

    private String resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "system";
        }
        String principalName = authentication.getName();
        if (StringUtils.isBlank(principalName) || Objects.equals("anonymousUser", principalName)) {
            return "system";
        }
        return principalName;
    }
}
