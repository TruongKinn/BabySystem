package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class CreateRoleRequest {

    @NotBlank
    private String name;

    private List<Long> permissionIds;
}

