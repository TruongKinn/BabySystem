package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serializable;

@Data
public class ForgotPasswordRequest implements Serializable {
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "usernameOrEmail must be not blank")
    private String usernameOrEmail;
}
