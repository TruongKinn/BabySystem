package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForceChangePasswordRequest {

    @NotBlank
    private String username;

    @NotBlank
    private String temporaryPassword;

    @NotBlank
    private String newPassword;
}
