package vn.agent.controller.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MissingApiPermissionResponse {
    private String source;
    private String method;
    private String path;
    private String suggestedName;
    private String suggestedDescription;
}
