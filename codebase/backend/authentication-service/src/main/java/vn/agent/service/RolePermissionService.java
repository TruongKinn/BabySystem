package vn.agent.service;

import vn.agent.controller.request.CreatePermissionRequest;
import vn.agent.controller.request.CreateRoleRequest;
import vn.agent.controller.request.UpdatePermissionRequest;
import vn.agent.controller.request.UpdateRoleRequest;
import vn.agent.controller.request.UpdateRolePermissionsRequest;
import vn.agent.common.PermissionType;
import vn.agent.controller.response.PageResponse;
import vn.agent.controller.response.PermissionResponse;
import vn.agent.controller.response.MissingApiPermissionResponse;
import vn.agent.controller.response.RolePermissionResponse;
import vn.agent.controller.response.RolePermissionWorkspaceResponse;
import vn.agent.controller.response.UserAccessResponse;

import java.util.List;

public interface RolePermissionService {

    RolePermissionWorkspaceResponse getWorkspace();

    RolePermissionResponse createRole(CreateRoleRequest request);

    RolePermissionResponse updateRole(Long roleId, UpdateRoleRequest request);

    void deleteRole(Long roleId);

    RolePermissionResponse updateRolePermissions(Long roleId, UpdateRolePermissionsRequest request);

    PermissionResponse createPermission(CreatePermissionRequest request);

    PermissionResponse updatePermission(Long permissionId, UpdatePermissionRequest request);

    void deletePermission(Long permissionId);

    UserAccessResponse getUserAccess(Long userId);

    List<MissingApiPermissionResponse> getMissingApiPermissions(String authorizationHeader);

    PageResponse<PermissionResponse> getPermissionsPage(int page, int size, String searchText, PermissionType type);
}
