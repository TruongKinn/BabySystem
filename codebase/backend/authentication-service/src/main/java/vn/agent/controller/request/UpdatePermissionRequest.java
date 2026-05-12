package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePermissionRequest {

    @NotBlank
    private String name;

    private String description;

    private String menuKey;

    private String apiMethod;

    private String apiPath;
}

