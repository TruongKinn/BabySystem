package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import vn.agent.common.PermissionType;

@Data
public class CreatePermissionRequest {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    private PermissionType type;

    private String menuKey;

    private String apiMethod;

    private String apiPath;
}

