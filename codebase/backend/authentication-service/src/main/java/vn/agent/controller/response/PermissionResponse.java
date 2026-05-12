package vn.agent.controller.response;

import lombok.Builder;
import lombok.Data;
import vn.agent.common.PermissionType;

@Data
@Builder
public class PermissionResponse {
    private Long id;
    private String name;
    private String description;
    private PermissionType type;
    private String menuKey;
    private String apiMethod;
    private String apiPath;
}

