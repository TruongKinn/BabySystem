package vn.agent.controller.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RolePermissionResponse {
    private Long id;
    private String name;
    private List<Long> permissionIds;
}

