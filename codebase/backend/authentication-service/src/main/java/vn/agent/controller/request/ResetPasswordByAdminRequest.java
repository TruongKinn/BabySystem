package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordByAdminRequest {

    @NotBlank
    private String temporaryPassword;
}
