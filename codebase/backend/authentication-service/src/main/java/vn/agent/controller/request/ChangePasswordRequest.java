package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotNull
    private Long id;

    @NotBlank
    private String oldPassword;

    @vn.agent.validation.StrongPassword
    private String newPassword;
}
