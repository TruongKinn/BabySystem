package vn.agent.controller.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserAccessResponse {
    private boolean admin;
    private List<String> roles;
    private List<String> menuKeys;
    private List<ApiAccessPermissionResponse> apiPermissions;
}

