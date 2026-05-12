package vn.agent.controller.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RolePermissionWorkspaceResponse {
    private List<RolePermissionResponse> roles;
    private List<PermissionResponse> menuPermissions;
    private List<PermissionResponse> apiPermissions;
}

