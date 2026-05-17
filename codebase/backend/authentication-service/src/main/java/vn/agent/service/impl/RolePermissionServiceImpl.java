package vn.agent.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.agent.common.PermissionType;
import vn.agent.controller.request.CreatePermissionRequest;
import vn.agent.controller.request.CreateRoleRequest;
import vn.agent.controller.request.UpdatePermissionRequest;
import vn.agent.controller.request.UpdateRoleRequest;
import vn.agent.controller.request.UpdateRolePermissionsRequest;
import vn.agent.controller.response.ApiAccessPermissionResponse;
import vn.agent.controller.response.MissingApiPermissionResponse;
import vn.agent.controller.response.PermissionResponse;
import vn.agent.controller.response.RolePermissionResponse;
import vn.agent.controller.response.RolePermissionWorkspaceResponse;
import vn.agent.controller.response.UserAccessResponse;
import vn.agent.exception.InvalidDataException;
import vn.agent.model.Permission;
import vn.agent.model.Role;
import vn.agent.model.RoleHasPermission;
import vn.agent.model.UserHasRole;
import vn.agent.repository.PermissionRepository;
import vn.agent.repository.RoleHasPermissionRepository;
import vn.agent.repository.RoleRepository;
import vn.agent.repository.UserHasRoleRepository;
import vn.agent.service.GatewayApiCatalogService;
import vn.agent.service.RolePermissionService;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolePermissionServiceImpl implements RolePermissionService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleHasPermissionRepository roleHasPermissionRepository;
    private final UserHasRoleRepository userHasRoleRepository;
    private final GatewayApiCatalogService gatewayApiCatalogService;

    @Override
    @Transactional(readOnly = true)
    public RolePermissionWorkspaceResponse getWorkspace() {
        List<Role> roles = roleRepository.findAll().stream()
                .sorted((left, right) -> left.getName().compareToIgnoreCase(right.getName()))
                .toList();
        List<Permission> permissions = permissionRepository.findAll();
        Map<Long, List<RoleHasPermission>> rolePermissionMap = roleHasPermissionRepository.findAll().stream()
                .collect(Collectors.groupingBy(item -> item.getRole().getId()));

        List<RolePermissionResponse> roleResponses = roles.stream()
                .map(role -> {
                    List<Long> permissionIds = rolePermissionMap.getOrDefault(role.getId(), List.of()).stream()
                            .map(item -> item.getPermission().getId())
                            .distinct()
                            .sorted()
                            .toList();
                    return RolePermissionResponse.builder()
                            .id(role.getId())
                            .name(role.getName())
                            .permissionIds(permissionIds)
                            .build();
                })
                .toList();

        List<PermissionResponse> menuPermissions = permissions.stream()
                .filter(item -> item.getType() == PermissionType.MENU)
                .sorted((left, right) -> left.getName().compareToIgnoreCase(right.getName()))
                .map(this::toPermissionResponse)
                .toList();

        List<PermissionResponse> apiPermissions = permissions.stream()
                .filter(item -> item.getType() == PermissionType.API)
                .sorted((left, right) -> left.getName().compareToIgnoreCase(right.getName()))
                .map(this::toPermissionResponse)
                .toList();

        return RolePermissionWorkspaceResponse.builder()
                .roles(roleResponses)
                .menuPermissions(menuPermissions)
                .apiPermissions(apiPermissions)
                .build();
    }

    @Override
    @Transactional
    public RolePermissionResponse createRole(CreateRoleRequest request) {
        String roleName = normalizeRoleName(request.getName());
        if (roleRepository.existsByNameIgnoreCase(roleName)) {
            throw new InvalidDataException("Role already exists: " + roleName);
        }

        Role role = new Role();
        role.setName(roleName);
        Role savedRole = roleRepository.save(role);
        List<Long> permissionIds = upsertRolePermissions(savedRole, request.getPermissionIds());

        return RolePermissionResponse.builder()
                .id(savedRole.getId())
                .name(savedRole.getName())
                .permissionIds(permissionIds)
                .build();
    }

    @Override
    @Transactional
    public RolePermissionResponse updateRole(Long roleId, UpdateRoleRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new InvalidDataException("Role not found: " + roleId));
        String roleName = normalizeRoleName(request.getName());
        if (!role.getName().equalsIgnoreCase(roleName) && roleRepository.existsByNameIgnoreCase(roleName)) {
            throw new InvalidDataException("Role already exists: " + roleName);
        }
        role.setName(roleName);
        Role savedRole = roleRepository.save(role);

        List<Long> permissionIds = roleHasPermissionRepository.findAllByRole_Id(savedRole.getId()).stream()
                .map(item -> item.getPermission().getId())
                .distinct()
                .sorted()
                .toList();

        return RolePermissionResponse.builder()
                .id(savedRole.getId())
                .name(savedRole.getName())
                .permissionIds(permissionIds)
                .build();
    }

    @Override
    @Transactional
    public void deleteRole(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new InvalidDataException("Role not found: " + roleId));
        roleHasPermissionRepository.deleteAllByRole_Id(roleId);
        userHasRoleRepository.deleteAllByRole_Id(roleId);
        roleRepository.delete(role);
    }

    @Override
    @Transactional
    public RolePermissionResponse updateRolePermissions(Long roleId, UpdateRolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new InvalidDataException("Role not found: " + roleId));
        List<Long> permissionIds = upsertRolePermissions(role, request.getPermissionIds());

        return RolePermissionResponse.builder()
                .id(role.getId())
                .name(role.getName())
                .permissionIds(permissionIds)
                .build();
    }

    @Override
    @Transactional
    public PermissionResponse createPermission(CreatePermissionRequest request) {
        String name = normalizePermissionName(request.getName());
        if (permissionRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new InvalidDataException("Permission already exists: " + name);
        }

        Permission permission = new Permission();
        permission.setName(name);
        permission.setDescription(trimToNull(request.getDescription()));
        permission.setType(request.getType());

        if (request.getType() == PermissionType.MENU) {
            String menuKey = trimToNull(request.getMenuKey());
            if (!StringUtils.hasText(menuKey)) {
                throw new InvalidDataException("menuKey is required for MENU permission");
            }
            permission.setMenuKey(menuKey);
            permission.setApiMethod(null);
            permission.setApiPath(null);
        } else if (request.getType() == PermissionType.API) {
            String method = trimToNull(request.getApiMethod());
            String path = trimToNull(request.getApiPath());
            if (!StringUtils.hasText(method) || !StringUtils.hasText(path)) {
                throw new InvalidDataException("apiMethod and apiPath are required for API permission");
            }
            permission.setApiMethod(method.toUpperCase());
            permission.setApiPath(path);
            permission.setMenuKey(null);
        }

        Permission saved = permissionRepository.save(permission);
        return toPermissionResponse(saved);
    }

    @Override
    @Transactional
    public PermissionResponse updatePermission(Long permissionId, UpdatePermissionRequest request) {
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new InvalidDataException("Permission not found: " + permissionId));

        String nextName = normalizePermissionName(request.getName());
        permissionRepository.findByNameIgnoreCase(nextName)
                .filter(existing -> !existing.getId().equals(permissionId))
                .ifPresent(existing -> {
                    throw new InvalidDataException("Permission already exists: " + nextName);
                });

        permission.setName(nextName);
        permission.setDescription(trimToNull(request.getDescription()));

        if (permission.getType() == PermissionType.MENU) {
            String menuKey = trimToNull(request.getMenuKey());
            if (!StringUtils.hasText(menuKey)) {
                throw new InvalidDataException("menuKey is required for MENU permission");
            }
            permission.setMenuKey(menuKey);
            permission.setApiMethod(null);
            permission.setApiPath(null);
        } else if (permission.getType() == PermissionType.API) {
            String method = trimToNull(request.getApiMethod());
            String path = trimToNull(request.getApiPath());
            if (!StringUtils.hasText(method) || !StringUtils.hasText(path)) {
                throw new InvalidDataException("apiMethod and apiPath are required for API permission");
            }
            permission.setApiMethod(method.toUpperCase());
            permission.setApiPath(path);
            permission.setMenuKey(null);
        }

        Permission saved = permissionRepository.save(permission);
        return toPermissionResponse(saved);
    }

    @Override
    @Transactional
    public void deletePermission(Long permissionId) {
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new InvalidDataException("Permission not found: " + permissionId));
        roleHasPermissionRepository.deleteAllByPermission_Id(permissionId);
        permissionRepository.delete(permission);
    }

    @Override
    @Transactional(readOnly = true)
    public UserAccessResponse getUserAccess(Long userId) {
        List<UserHasRole> userRoles = userHasRoleRepository.findAllByUserId(userId);
        List<String> roleNames = userRoles.stream()
                .map(UserHasRole::getRole)
                .filter(role -> role != null && StringUtils.hasText(role.getName()))
                .map(Role::getName)
                .map(String::toUpperCase)
                .distinct()
                .sorted()
                .toList();
        boolean isAdmin = roleNames.contains("ADMIN");

        List<Long> roleIds = userRoles.stream()
                .map(UserHasRole::getRole)
                .filter(role -> role != null && role.getId() != null)
                .map(Role::getId)
                .distinct()
                .toList();

        if (roleIds.isEmpty()) {
            return UserAccessResponse.builder()
                    .admin(isAdmin)
                    .roles(roleNames)
                    .menuKeys(List.of())
                    .apiPermissions(List.of())
                    .build();
        }

        List<RoleHasPermission> mappings = roleHasPermissionRepository.findAllByRole_IdIn(roleIds);
        List<Permission> permissions = mappings.stream()
                .map(RoleHasPermission::getPermission)
                .filter(item -> item != null && item.getType() != null)
                .toList();

        List<String> menuKeys = permissions.stream()
                .filter(item -> item.getType() == PermissionType.MENU)
                .map(Permission::getMenuKey)
                .filter(StringUtils::hasText)
                .distinct()
                .sorted()
                .toList();

        List<ApiAccessPermissionResponse> apiPermissions = permissions.stream()
                .filter(item -> item.getType() == PermissionType.API)
                .filter(item -> StringUtils.hasText(item.getApiMethod()) && StringUtils.hasText(item.getApiPath()))
                .map(item -> ApiAccessPermissionResponse.builder()
                        .method(item.getApiMethod())
                        .path(item.getApiPath())
                        .build())
                .distinct()
                .toList();

        return UserAccessResponse.builder()
                .admin(isAdmin)
                .roles(roleNames)
                .menuKeys(menuKeys)
                .apiPermissions(apiPermissions)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissingApiPermissionResponse> getMissingApiPermissions(String authorizationHeader) {
        Set<String> existingApiPermissionKeys = permissionRepository.findAllByType(PermissionType.API).stream()
                .filter(item -> StringUtils.hasText(item.getApiMethod()) && StringUtils.hasText(item.getApiPath()))
                .map(item -> buildPermissionKey(item.getApiMethod(), item.getApiPath()))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return gatewayApiCatalogService.discoverApiEndpoints(authorizationHeader).stream()
                .filter(item -> !existingApiPermissionKeys.contains(buildPermissionKey(item.method(), item.path())))
                .map(item -> MissingApiPermissionResponse.builder()
                        .source(item.source())
                        .method(item.method())
                        .path(normalizeApiPath(item.path()))
                        .suggestedName(buildSuggestedPermissionName(item.method(), item.path()))
                        .suggestedDescription(buildSuggestedDescription(item.source(), item.method(), item.path()))
                        .build())
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                item -> buildPermissionKey(item.getMethod(), item.getPath()),
                                Function.identity(),
                                (first, ignored) -> first,
                                java.util.LinkedHashMap::new),
                        map -> map.values().stream().toList()));
    }

    private List<Long> upsertRolePermissions(Role role, List<Long> requestedPermissionIds) {
        Set<Long> normalizedIds = requestedPermissionIds == null
                ? Set.of()
                : requestedPermissionIds.stream()
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        roleHasPermissionRepository.deleteAllByRole_Id(role.getId());
        if (normalizedIds.isEmpty()) {
            return List.of();
        }

        Map<Long, Permission> permissionMap = permissionRepository.findAllById(normalizedIds).stream()
                .collect(Collectors.toMap(Permission::getId, Function.identity()));
        if (permissionMap.size() != normalizedIds.size()) {
            Set<Long> missingIds = new HashSet<>(normalizedIds);
            missingIds.removeAll(permissionMap.keySet());
            throw new InvalidDataException("Permission not found: " + missingIds);
        }

        List<RoleHasPermission> mappings = new ArrayList<>();
        for (Long permissionId : normalizedIds) {
            RoleHasPermission mapping = new RoleHasPermission();
            mapping.setRole(role);
            mapping.setPermission(permissionMap.get(permissionId));
            mappings.add(mapping);
        }
        roleHasPermissionRepository.saveAll(mappings);
        return new ArrayList<>(normalizedIds);
    }

    private PermissionResponse toPermissionResponse(Permission permission) {
        return PermissionResponse.builder()
                .id(permission.getId())
                .name(permission.getName())
                .description(permission.getDescription())
                .type(permission.getType())
                .menuKey(permission.getMenuKey())
                .apiMethod(permission.getApiMethod())
                .apiPath(permission.getApiPath())
                .build();
    }

    private String buildPermissionKey(String method, String path) {
        String normalizedMethod = trimToNull(method);
        String normalizedPath = normalizeApiPath(path);
        if (!StringUtils.hasText(normalizedMethod) || !StringUtils.hasText(normalizedPath)) {
            return "";
        }
        return normalizedMethod.toUpperCase(Locale.ROOT) + ":" + normalizedPath;
    }

    private String normalizeApiPath(String path) {
        String value = trimToNull(path);
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String normalized = value.replaceAll("/{2,}", "/");
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String buildSuggestedPermissionName(String method, String path) {
        String normalizedMethod = trimToNull(method);
        String normalizedPath = normalizeApiPath(path);
        String methodPart = StringUtils.hasText(normalizedMethod)
                ? normalizedMethod.toUpperCase(Locale.ROOT)
                : "API";
        String pathPart = normalizedPath
                .replaceAll("\\{[^}]+}", "PARAM")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "")
                .toUpperCase(Locale.ROOT);

        if (!StringUtils.hasText(pathPart)) {
            pathPart = "ENDPOINT";
        }
        return "API:" + methodPart + ":" + pathPart;
    }

    private String buildSuggestedDescription(String source, String method, String path) {
        String safeSource = trimToNull(source);
        String safeMethod = trimToNull(method);
        String safePath = normalizeApiPath(path);
        String target = StringUtils.hasText(safeSource) ? safeSource : "service";
        String action = StringUtils.hasText(safeMethod) ? safeMethod.toUpperCase(Locale.ROOT) : "API";
        return "Auto generated from " + target + " - " + action + " " + safePath;
    }

    private String normalizeRoleName(String roleName) {
        String value = trimToNull(roleName);
        if (!StringUtils.hasText(value)) {
            throw new InvalidDataException("Role name is required");
        }
        return value.toUpperCase();
    }

    private String normalizePermissionName(String name) {
        String value = trimToNull(name);
        if (!StringUtils.hasText(value)) {
            throw new InvalidDataException("Permission name is required");
        }
        return value.toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
