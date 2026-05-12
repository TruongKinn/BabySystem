package vn.agent.controller.request;

import lombok.Data;

import java.util.List;

@Data
public class UpdateRolePermissionsRequest {
    private List<Long> permissionIds;
}

