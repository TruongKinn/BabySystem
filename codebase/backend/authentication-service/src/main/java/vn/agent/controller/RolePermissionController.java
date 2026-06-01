package vn.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.agent.common.PermissionType;
import vn.agent.controller.request.CreatePermissionRequest;
import vn.agent.controller.request.CreateRoleRequest;
import vn.agent.controller.request.UpdatePermissionRequest;
import vn.agent.controller.request.UpdateRoleRequest;
import vn.agent.controller.request.UpdateRolePermissionsRequest;
import vn.agent.controller.response.MissingApiPermissionResponse;
import vn.agent.controller.response.PageResponse;
import vn.agent.controller.response.PermissionResponse;
import vn.agent.controller.response.RolePermissionResponse;
import vn.agent.controller.response.RolePermissionWorkspaceResponse;
import vn.agent.controller.response.UserAccessResponse;
import vn.agent.service.RolePermissionService;

import java.util.List;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@Tag(name = "Role Permission Controller")
public class RolePermissionController {

    private final RolePermissionService rolePermissionService;

    @GetMapping("/workspace")
    @Operation(summary = "Get role-permission workspace")
    public ResponseEntity<RolePermissionWorkspaceResponse> getWorkspace() {
        return ResponseEntity.ok(rolePermissionService.getWorkspace());
    }

    @PostMapping
    @Operation(summary = "Create role")
    public ResponseEntity<RolePermissionResponse> createRole(@Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(rolePermissionService.createRole(request));
    }

    @PutMapping("/{roleId}")
    @Operation(summary = "Update role")
    public ResponseEntity<RolePermissionResponse> updateRole(
            @PathVariable Long roleId,
            @Valid @RequestBody UpdateRoleRequest request) {
        return ResponseEntity.ok(rolePermissionService.updateRole(roleId, request));
    }

    @DeleteMapping("/{roleId}")
    @Operation(summary = "Delete role")
    public ResponseEntity<Void> deleteRole(@PathVariable Long roleId) {
        rolePermissionService.deleteRole(roleId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{roleId}/permissions")
    @Operation(summary = "Update role permissions")
    public ResponseEntity<RolePermissionResponse> updateRolePermissions(
            @PathVariable Long roleId,
            @RequestBody UpdateRolePermissionsRequest request) {
        return ResponseEntity.ok(rolePermissionService.updateRolePermissions(roleId, request));
    }

    @PostMapping("/permissions")
    @Operation(summary = "Create permission")
    public ResponseEntity<PermissionResponse> createPermission(@Valid @RequestBody CreatePermissionRequest request) {
        return ResponseEntity.ok(rolePermissionService.createPermission(request));
    }

    @PutMapping("/permissions/{permissionId}")
    @Operation(summary = "Update permission")
    public ResponseEntity<PermissionResponse> updatePermission(
            @PathVariable Long permissionId,
            @Valid @RequestBody UpdatePermissionRequest request) {
        return ResponseEntity.ok(rolePermissionService.updatePermission(permissionId, request));
    }

    @DeleteMapping("/permissions/{permissionId}")
    @Operation(summary = "Delete permission")
    public ResponseEntity<Void> deletePermission(@PathVariable Long permissionId) {
        rolePermissionService.deletePermission(permissionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/permissions/missing-apis")
    @Operation(summary = "Get API endpoints that do not have permission in DB yet")
    public ResponseEntity<List<MissingApiPermissionResponse>> getMissingApiPermissions(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader) {
        return ResponseEntity.ok(rolePermissionService.getMissingApiPermissions(authorizationHeader));
    }

    @GetMapping("/users/{userId}/access")
    @Operation(summary = "Get user access (role/menu/api permissions)")
    public ResponseEntity<UserAccessResponse> getUserAccess(@PathVariable Long userId) {
        return ResponseEntity.ok(rolePermissionService.getUserAccess(userId));
    }

    @GetMapping("/permissions")
    @Operation(summary = "Get permissions list with pagination and optional search/filter")
    public ResponseEntity<PageResponse<PermissionResponse>> getPermissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String searchText,
            @RequestParam(required = false) PermissionType type) {
        return ResponseEntity.ok(rolePermissionService.getPermissionsPage(page, size, searchText, type));
    }

    @GetMapping("/test-missing-permission-real")
    @Operation(summary = "Temporary API to test missing permissions feature")
    public ResponseEntity<String> testMissingPermission() {
        return ResponseEntity.ok("Test missing permission function");
    }
}

