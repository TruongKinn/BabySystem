package vn.agent.controller.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiAccessPermissionResponse {
    private String method;
    private String path;
}

